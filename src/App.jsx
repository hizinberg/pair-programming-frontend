import React from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Room from "./Rooms";

function Landing() {
  const navigate = useNavigate();

  const createRoom = async () => {
    const res = await fetch("http://localhost:8000/rooms", { method: "POST" });
    const data = await res.json();
    navigate(`/room/${data.roomId}`);
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Pair Programming Prototype</h1>
      <p>Create a room to start collaborating.</p>
      <button onClick={createRoom}>Create Room</button>
      <div style={{ marginTop: 20 }}>
        <small>Or join an existing room by entering its id below:</small>
      </div>
      <JoinBox />
    </div>
  );
}

function JoinBox() {
  const [room, setRoom] = React.useState("");
  const navigate = useNavigate();

  const join = () => {
    if (!room) return;
    navigate(`/room/${room}`);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="room id" />
      <button onClick={join} style={{ marginLeft: 8 }}>Join</button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Landing />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}
