import { useEffect, useMemo, useState, useCallback } from "react";
import type { DragEvent } from "react";
import { AdminApi } from "../../../api/admin";
import type { Playlist } from "../../../api/types";
import "../../../styles/admin/PlayListsPage.css";

interface ScheduleItem {
  id: string;
  adName: string;
  videoUrl?: string;
  playTime: string; // "14:30"
  duration: string; // "00:30"
  date: string; // "2026-03-10"
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0] ?? "");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadPlaylists = useCallback(async () => {
    const data = await AdminApi.listPlaylists();
    setPlaylists(data);

    setSelectedPlaylist((prev) => {
      if (prev) return prev;
      return data.length > 0 ? data[0].id : null;
    });
  }, []);



  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => item.date === filterDate);
  }, [schedule, filterDate]);

  const handleDragStart = useCallback((e: DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLTableRowElement>, targetIndex: number) => {
      e.preventDefault();

      setSchedule((prev) => {
        const visibleRows = prev.filter((item) => item.date === filterDate);

        if (!draggedItemId) return prev;

        const sourceIndex = visibleRows.findIndex((item) => item.id === draggedItemId);
        if (sourceIndex === -1) return prev;
        if (sourceIndex === targetIndex) return prev;

        const reorderedVisible = [...visibleRows];
        const [movedRow] = reorderedVisible.splice(sourceIndex, 1);
        reorderedVisible.splice(targetIndex, 0, movedRow);

        const hiddenRows = prev.filter((item) => item.date !== filterDate);
        return [...hiddenRows, ...reorderedVisible];
      });

      setDraggedItemId(null);
    },
    [draggedItemId, filterDate]
  );

  const uploadVideo = useCallback(async (file: File) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("video", file);

      // TODO: replace with real upload endpoint later
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      setUploading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);

  
  return (
    <div className="page">
      <div className="header">
        <h2>Playlist Scheduler</h2>
        <p>Drag ads to reschedule • Filter by date • Upload videos</p>
      </div>

      <div className="controls">
        <select
          value={selectedPlaylist ?? ""}
          onChange={(e) => setSelectedPlaylist(e.target.value || null)}
          className="select"
        >
          <option value="">Select Playlist</option>
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="dateInput"
        />

        <label className="uploadBtn">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void uploadVideo(file);
              }
            }}
            disabled={uploading}
          />
          {uploading ? "Uploading..." : "Upload Video"}
        </label>
      </div>

      <div className="tableContainer">
        <table className="scheduleTable">
          <thead>
            <tr>
              <th>Time Played</th>
              <th>Ad Name</th>
              <th>Duration</th>
              <th>Video</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedule.map((item, index) => (
              <tr
                key={item.id}
                className={`scheduleRow ${draggedItemId === item.id ? "dragging" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => setDraggedItemId(null)}
              >
                <td className="timeCell">{item.playTime}</td>
                <td className="adName">{item.adName}</td>
                <td className="duration">{item.duration}</td>
                <td className="videoCell">
                  {item.videoUrl ? <video width="80" controls src={item.videoUrl} /> : "No video"}
                </td>
                <td className="dateCell">{item.date}</td>
                <td className="actions">
                  <button className="editBtn" type="button">
                    Edit
                  </button>
                  <button className="deleteBtn" type="button">
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredSchedule.length === 0 && (
              <tr>
                <td colSpan={6} className="emptyState">
                  No schedule for {filterDate}. Drag ads here to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

