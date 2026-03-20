// frontend/src/features/operator/pages/PlaylistsPage.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorApi } from "../../../api/operator";
import type {
  Channel,
  PlaylistItem,
  PlaylistSchedule,
  PlaylistSource,
} from "../../../api/types";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import OperatorCard from "../components/OperatorCard";
import OperatorSectionHeader from "../components/OperatorSectionHeader";
import "../../../styles/operator/PlaylistsPage.css";

/**
 * Temporary advertisement option model used by the operator picker.
 * Replace this with a real advertisement endpoint when available.
 */
type AdvertisementOption = {
  id: string;
  title: string;
  advertiser: string;
};

/**
 * Small local seed list used until a real operator advertisement list endpoint exists.
 * This gives operators a searchable dropdown instead of typing raw IDs manually.
 */
const ADVERTISEMENT_OPTIONS: AdvertisementOption[] = [
  { id: "ad-001", title: "Coca-Cola 30s", advertiser: "Coca-Cola" },
  { id: "ad-002", title: "Airtel Data Promo 45s", advertiser: "Airtel" },
  { id: "ad-003", title: "Shoprite Weekend Deal 30s", advertiser: "Shoprite" },
  { id: "ad-004", title: "MTN Voice Bundle 30s", advertiser: "MTN" },
  { id: "ad-005", title: "Zambeef Value Offer 20s", advertiser: "Zambeef" },
  { id: "ad-006", title: "Stanbic App Campaign 60s", advertiser: "Stanbic" },
];

/**
 * Converts a datetime-local input value to ISO.
 * Returns null for empty/invalid values.
 */
function localInputToIso(value: string): string | null {
  if (!value.trim()) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

/**
 * Converts an ISO timestamp into a datetime-local string for editing.
 */
function isoToLocalInput(value?: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/**
 * Returns the duration in milliseconds between two datetime-local values.
 */
function getDurationMsFromLocalRange(startLocal: string, endLocal: string): number {
  const start = new Date(startLocal).getTime();
  const end = new Date(endLocal).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

/**
 * Formats date/time for table and summary display.
 */
function formatDateTime(value?: string): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

/**
 * Returns a friendly channel name from the loaded channel list.
 */
function getChannelName(channels: Channel[], id?: string): string {
  if (!id) return "-";
  return channels.find((item) => item.id === id)?.name ?? id;
}

/**
 * Calculates whether two schedule ranges overlap.
 */
function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Builds a conflict list for the candidate item being entered.
 */
function findScheduleConflicts(
  items: PlaylistItem[],
  startIso: string | null,
  endIso: string | null,
  editingItemId?: string | null,
): PlaylistItem[] {
  if (!startIso || !endIso) return [];

  return items.filter((item) => {
    if (editingItemId && item.id === editingItemId) {
      return false;
    }

    return rangesOverlap(startIso, endIso, item.expected_start_time, item.expected_end_time);
  });
}

/**
 * Produces a simple break group label.
 * If break_id is missing, we derive a readable grouping from start time.
 */
function getBreakGroupLabel(item: PlaylistItem): string {
  if (item.break_id) return item.break_id;

  const date = new Date(item.expected_start_time);
  if (Number.isNaN(date.getTime())) return "Unassigned Break";

  return `Break ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function PlaylistsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Schedule selection / creation context
  const [channelId, setChannelId] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState<PlaylistSource>("manual");
  const [version, setVersion] = useState<number>(1);

  // Advanced fallback for manual loading until backend supports lookup by channel+date
  const [scheduleId, setScheduleId] = useState("");

  // Loaded schedule state
  const [schedule, setSchedule] = useState<PlaylistSchedule | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);

  // Item form state
  const [advertisementSearch, setAdvertisementSearch] = useState("");
  const [selectedAdId, setSelectedAdId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [durationMs, setDurationMs] = useState<number>(30000);

  // Edit placeholder state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  /**
   * Load channels for the channel selector.
   */
  const init = useCallback(async () => {
    setErr(null);
    setLoadingChannels(true);

    try {
      const channelRows = await OperatorApi.listChannels();
      setChannels(channelRows);
      setChannelId((prev) => prev || (channelRows[0]?.id ?? ""));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load channels");
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  /**
   * Derive duration automatically when operators adjust start/end using datetime-local fields.
   */
  useEffect(() => {
    const computed = getDurationMsFromLocalRange(startLocal, endLocal);
    if (computed > 0) {
      setDurationMs(computed);
    }
  }, [startLocal, endLocal]);

  const selectedChannelName = useMemo(() => {
    return getChannelName(channels, channelId);
  }, [channels, channelId]);

  const selectedAdvertisement = useMemo(() => {
    return ADVERTISEMENT_OPTIONS.find((item) => item.id === selectedAdId) ?? null;
  }, [selectedAdId]);

  const filteredAdvertisements = useMemo(() => {
    const term = advertisementSearch.trim().toLowerCase();

    if (!term) return ADVERTISEMENT_OPTIONS;

    return ADVERTISEMENT_OPTIONS.filter((item) => {
      return (
        item.title.toLowerCase().includes(term) ||
        item.advertiser.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      );
    });
  }, [advertisementSearch]);

  const canCreateSchedule = useMemo(() => {
    return channelId.trim().length > 0 && scheduleDate.trim().length > 0 && version >= 1 && !creatingSchedule;
  }, [channelId, scheduleDate, version, creatingSchedule]);

  const canLoadScheduleById = useMemo(() => {
    return scheduleId.trim().length > 0 && !loadingSchedule;
  }, [scheduleId, loadingSchedule]);

  const startIso = useMemo(() => localInputToIso(startLocal), [startLocal]);
  const endIso = useMemo(() => localInputToIso(endLocal), [endLocal]);

  const dateRangeError = useMemo(() => {
    if (!startLocal || !endLocal) return null;
    if (!startIso || !endIso) return "Start and end date/time are invalid.";
    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      return "End time must be later than start time.";
    }
    return null;
  }, [startLocal, endLocal, startIso, endIso]);

  const conflicts = useMemo(() => {
    return findScheduleConflicts(items, startIso, endIso, editingItemId);
  }, [items, startIso, endIso, editingItemId]);

  const canSaveItem = useMemo(() => {
    return (
      !!schedule &&
      !!selectedAdId &&
      !!startLocal &&
      !!endLocal &&
      !!startIso &&
      !!endIso &&
      !dateRangeError &&
      durationMs > 0 &&
      conflicts.length === 0 &&
      !savingItem
    );
  }, [
    schedule,
    selectedAdId,
    startLocal,
    endLocal,
    startIso,
    endIso,
    dateRangeError,
    durationMs,
    conflicts.length,
    savingItem,
  ]);

  /**
   * Create a schedule from channel/date/source/version.
   */
  async function onCreateSchedule() {
    if (!canCreateSchedule) return;

    setErr(null);
    setSuccess(null);
    setCreatingSchedule(true);

    try {
      const created = await OperatorApi.createPlaylistSchedule({
        channel_id: channelId,
        schedule_date: scheduleDate,
        source,
        version,
        metadata: {},
      });

      setSchedule(created);
      setScheduleId(created.id);
      setItems([]);
      setSuccess(`Schedule created for ${selectedChannelName} on ${scheduleDate}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create schedule failed");
    } finally {
      setCreatingSchedule(false);
    }
  }

  /**
   * Manual fallback loader by raw schedule ID.
   * Keep this until backend exposes a lookup-by-channel-and-date endpoint.
   */
  async function onLoadScheduleById() {
    if (!canLoadScheduleById) return;

    setErr(null);
    setSuccess(null);
    setLoadingSchedule(true);

    try {
      const loadedSchedule = await OperatorApi.getPlaylistSchedule(scheduleId.trim());
      const loadedItems = await OperatorApi.listPlaylistItems(scheduleId.trim());

      setSchedule(loadedSchedule);
      setItems(loadedItems);
      setChannelId(loadedSchedule.channel_id);
      setScheduleDate(loadedSchedule.schedule_date);
      setSource(loadedSchedule.source);
      setVersion(loadedSchedule.version);

      setSuccess(`Schedule loaded successfully.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load schedule failed");
    } finally {
      setLoadingSchedule(false);
    }
  }

  /**
   * Create a new schedule item.
   * Note: update/delete endpoints for items are not yet present,
   * so edit mode currently loads data into the form for review only.
   */
  async function onSaveItem() {
    setErr(null);
    setSuccess(null);

    if (!schedule) {
      setErr("Create or load a schedule first.");
      return;
    }

    if (!selectedAdId) {
      setErr("Select an advertisement first.");
      return;
    }

    if (!startIso || !endIso) {
      setErr("Enter valid start and end times.");
      return;
    }

    if (dateRangeError) {
      setErr(dateRangeError);
      return;
    }

    if (conflicts.length > 0) {
      setErr("This item overlaps with an existing schedule item. Resolve the conflict first.");
      return;
    }

    if (editingItemId) {
      setErr(
        "Playlist item update endpoint is not available yet. Edit mode currently loads the item into the form only.",
      );
      return;
    }

    setSavingItem(true);

    try {
      await OperatorApi.createPlaylistItem({
        playlist_schedule_id: schedule.id,
        channel_id: schedule.channel_id,
        advertisement_id: selectedAdId,
        expected_start_time: startIso,
        expected_end_time: endIso,
        expected_duration_ms: durationMs,
        position_in_break: null,
        break_id: null,
      });

      const updatedItems = await OperatorApi.listPlaylistItems(schedule.id);
      setItems(updatedItems);

      setAdvertisementSearch("");
      setSelectedAdId("");
      setStartLocal("");
      setEndLocal("");
      setDurationMs(30000);
      setEditingItemId(null);

      setSuccess("Schedule item added successfully.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create item failed");
    } finally {
      setSavingItem(false);
    }
  }

  /**
   * Load an existing item into the form for review/edit preparation.
   * Persisted item update still requires a backend endpoint.
   */
  function onEditItem(item: PlaylistItem) {
    setErr(null);
    setSuccess(null);

    setEditingItemId(item.id);
    setSelectedAdId(item.advertisement_id);
    setStartLocal(isoToLocalInput(item.expected_start_time));
    setEndLocal(isoToLocalInput(item.expected_end_time));
    setDurationMs(item.expected_duration_ms);

    const match = ADVERTISEMENT_OPTIONS.find((ad) => ad.id === item.advertisement_id);
    setAdvertisementSearch(match ? match.title : item.advertisement_id);

    setSuccess("Item loaded into the form. Saving changes requires an item update endpoint.");
  }

  /**
   * Placeholder delete action until backend delete endpoint exists.
   */
  function onDeleteItem(item: PlaylistItem) {
    setErr(
      `Delete action for item ${item.id} is not connected yet. Add a backend delete endpoint before enabling this.`,
    );
  }

  /**
   * Clears item form state.
   */
  function resetItemForm() {
    setEditingItemId(null);
    setAdvertisementSearch("");
    setSelectedAdId("");
    setStartLocal("");
    setEndLocal("");
    setDurationMs(30000);
  }

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PlaylistItem[]>();

    [...items]
      .sort((a, b) => {
        return new Date(a.expected_start_time).getTime() - new Date(b.expected_start_time).getTime();
      })
      .forEach((item) => {
        const label = getBreakGroupLabel(item);
        const group = groups.get(label) ?? [];
        group.push(item);
        groups.set(label, group);
      });

    return Array.from(groups.entries());
  }, [items]);

  return (
    <div className="operator-playlists-page">
      <OperatorSectionHeader
        title="Playlists"
        subtitle="Select channel and date, create or load a schedule, add items with date/time pickers, and review conflicts."
        action={
          <button
            type="button"
            className="operator-playlists-secondary-btn"
            onClick={() => void init()}
            disabled={loadingChannels}
          >
            {loadingChannels ? "Refreshing..." : "Refresh Channels"}
          </button>
        }
      />

      {(err || success) && (
        <div className="operator-playlists-message-wrap">
          {err ? <ErrorMessage message={err} /> : null}
          {success ? <div className="operator-playlists-success-box">{success}</div> : null}
        </div>
      )}

      <div className="operator-playlists-grid-two">
        <OperatorCard
          title="Schedule Context"
          subtitle="Choose the working channel/date and create a schedule for operator entry."
        >
          <div className="operator-playlists-form-grid">
            <label className="operator-playlists-label">
              Channel
              <select
                className="operator-playlists-input"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              >
                {channels.length === 0 && <option value="">No channels</option>}
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="operator-playlists-label">
              Schedule Date
              <input
                className="operator-playlists-input"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </label>

            <label className="operator-playlists-label">
              Source
              <select
                className="operator-playlists-input"
                value={source}
                onChange={(e) => setSource(e.target.value as PlaylistSource)}
              >
                <option value="manual">manual</option>
                <option value="automation_import">automation_import</option>
                <option value="api">api</option>
                <option value="recurring">recurring</option>
              </select>
            </label>

            <label className="operator-playlists-label">
              Version
              <input
                className="operator-playlists-input"
                type="number"
                min={1}
                value={version}
                onChange={(e) => setVersion(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="operator-playlists-action-row">
            <button
              type="button"
              className="operator-playlists-primary-btn"
              disabled={!canCreateSchedule}
              onClick={() => void onCreateSchedule()}
            >
              {creatingSchedule ? "Creating..." : "Create Schedule"}
            </button>
          </div>

          <div className="operator-playlists-summary-panel">
            <div><b>Selected Channel:</b> {selectedChannelName}</div>
            <div><b>Selected Date:</b> {scheduleDate || "-"}</div>
            <div><b>Source:</b> {source}</div>
            <div><b>Version:</b> {version}</div>
          </div>
        </OperatorCard>

        <OperatorCard
          title="Load Existing Schedule"
          subtitle="Temporary manual fallback by schedule ID until backend supports lookup by channel + date."
        >
          <label className="operator-playlists-label">
            Schedule ID
            <input
              className="operator-playlists-input"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              placeholder="UUID"
            />
          </label>

          <div className="operator-playlists-action-row">
            <button
              type="button"
              className="operator-playlists-secondary-btn"
              disabled={!canLoadScheduleById}
              onClick={() => void onLoadScheduleById()}
            >
              {loadingSchedule ? "Loading..." : "Load by ID"}
            </button>
          </div>

          {schedule ? (
            <div className="operator-playlists-summary-panel">
              <div><b>Schedule ID:</b> {schedule.id}</div>
              <div><b>Channel:</b> {getChannelName(channels, schedule.channel_id)}</div>
              <div><b>Date:</b> {schedule.schedule_date}</div>
              <div><b>Source:</b> {schedule.source}</div>
              <div><b>Version:</b> {schedule.version}</div>
              <div><b>Total Items:</b> {items.length}</div>
            </div>
          ) : (
            <div className="operator-playlists-muted">
              No schedule loaded yet.
            </div>
          )}
        </OperatorCard>
      </div>

      <OperatorCard
        title="Add Schedule Item"
        subtitle="Use operator-friendly inputs: searchable advertisement picker, datetime-local fields, auto duration, and conflict warnings."
      >
        {!schedule ? (
          <EmptyState
            title="No active schedule"
            description="Create a schedule or load one by ID before adding items."
          />
        ) : (
          <>
            <div className="operator-playlists-form-grid">
              <label className="operator-playlists-label">
                Search Advertisement
                <input
                  className="operator-playlists-input"
                  value={advertisementSearch}
                  onChange={(e) => setAdvertisementSearch(e.target.value)}
                  placeholder="Search by ad title, advertiser, or ID"
                />
              </label>

              <label className="operator-playlists-label">
                Advertisement Picker
                <select
                  className="operator-playlists-input"
                  value={selectedAdId}
                  onChange={(e) => setSelectedAdId(e.target.value)}
                >
                  <option value="">Select advertisement</option>
                  {filteredAdvertisements.map((ad) => (
                    <option key={ad.id} value={ad.id}>
                      {ad.title} - {ad.advertiser}
                    </option>
                  ))}
                </select>
              </label>

              <label className="operator-playlists-label">
                Expected Start
                <input
                  className="operator-playlists-input"
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                />
              </label>

              <label className="operator-playlists-label">
                Expected End
                <input
                  className="operator-playlists-input"
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                />
              </label>

              <label className="operator-playlists-label">
                Duration (ms)
                <input
                  className="operator-playlists-input"
                  type="number"
                  min={1}
                  value={durationMs}
                  onChange={(e) => setDurationMs(Number(e.target.value))}
                />
              </label>

              <div className="operator-playlists-selected-ad-panel">
                <div className="operator-playlists-selected-ad-title">Selected Advertisement</div>
                {selectedAdvertisement ? (
                  <>
                    <div><b>Title:</b> {selectedAdvertisement.title}</div>
                    <div><b>Advertiser:</b> {selectedAdvertisement.advertiser}</div>
                    <div><b>ID:</b> {selectedAdvertisement.id}</div>
                  </>
                ) : (
                  <div className="operator-playlists-muted">No advertisement selected.</div>
                )}
              </div>
            </div>

            {dateRangeError ? (
              <div className="operator-playlists-warning-box">{dateRangeError}</div>
            ) : null}

            {conflicts.length > 0 ? (
              <div className="operator-playlists-warning-box">
                <div className="operator-playlists-warning-title">Schedule conflict detected</div>
                <ul className="operator-playlists-conflict-list">
                  {conflicts.map((item) => (
                    <li key={item.id}>
                      Conflicts with item {item.id} from {formatDateTime(item.expected_start_time)} to{" "}
                      {formatDateTime(item.expected_end_time)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="operator-playlists-action-row">
              <button
                type="button"
                className="operator-playlists-primary-btn"
                disabled={!canSaveItem}
                onClick={() => void onSaveItem()}
              >
                {editingItemId ? "Save Changes" : savingItem ? "Saving..." : "Add Item"}
              </button>

              <button
                type="button"
                className="operator-playlists-secondary-btn"
                onClick={resetItemForm}
              >
                Reset Form
              </button>
            </div>
          </>
        )}
      </OperatorCard>

      <OperatorCard
        title="Schedule Items"
        subtitle="Grouped by break, with conflict-aware scheduling and operator review actions."
      >
        {items.length === 0 ? (
          <EmptyState
            title="No schedule items"
            description="Once items are added to the loaded schedule, they will appear here."
          />
        ) : (
          <div className="operator-playlists-group-list">
            {groupedItems.map(([groupLabel, groupItems]) => (
              <div key={groupLabel} className="operator-playlists-group-card">
                <div className="operator-playlists-group-title">{groupLabel}</div>

                <div className="operator-playlists-table-wrap">
                  <table className="operator-playlists-table">
                    <thead>
                      <tr>
                        <th className="operator-playlists-th">Advertisement ID</th>
                        <th className="operator-playlists-th">Channel</th>
                        <th className="operator-playlists-th">Start</th>
                        <th className="operator-playlists-th">End</th>
                        <th className="operator-playlists-th">Duration (ms)</th>
                        <th className="operator-playlists-th">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {groupItems.map((item) => (
                        <tr key={item.id} className="operator-playlists-tr">
                          <td className="operator-playlists-td-mono">{item.advertisement_id}</td>
                          <td className="operator-playlists-td">
                            {getChannelName(channels, item.channel_id)}
                          </td>
                          <td className="operator-playlists-td-mono">
                            {formatDateTime(item.expected_start_time)}
                          </td>
                          <td className="operator-playlists-td-mono">
                            {formatDateTime(item.expected_end_time)}
                          </td>
                          <td className="operator-playlists-td">{item.expected_duration_ms}</td>
                          <td className="operator-playlists-td">
                            <div className="operator-playlists-actions-wrap">
                              <button
                                type="button"
                                className="operator-playlists-small-ghost-btn"
                                onClick={() => onEditItem(item)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="operator-playlists-small-danger-btn"
                                onClick={() => onDeleteItem(item)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="operator-playlists-hint">
          Current backend supports schedule creation, schedule lookup by ID, item listing, and item creation. For full
          operator workflow completion, add: schedule lookup by channel/date, advertisement list endpoint, item update,
          and item delete endpoints.
        </div>
      </OperatorCard>
    </div>
  );
}