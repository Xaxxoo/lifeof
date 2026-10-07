"use client";

import { OrthographicCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Color } from "three";
import { api } from "@convex/_generated/api";
import { ROOMS, blockedTiles } from "@nyl/content";
import { daylight, findPath, nycTime, poseAt, tileAt, type MoveIntent, type RoomGrid } from "@nyl/game-core";
import { serverNow, useGame } from "@/lib/store";
import { Avatar } from "./scene/Avatar";
import { Props, propLabelPos } from "./scene/Props";
import { LabelProjector, anchorRef, useLabelAnchors } from "./scene/Labels";
import { Street } from "./scene/Street";
import { Weather } from "./scene/Weather";
import { Hud } from "./Hud";

const BUBBLE_MS = 8_000;
const NIGHT_SKY = new Color("#0b1020");
const DAY_SKY = new Color("#a9d2ee");

export function World({ token, roomId }: { token: string; roomId: string }) {
  const room = ROOMS[roomId]!;
  const grid: RoomGrid = useMemo(
    () => ({ width: room.width, height: room.height, blocked: blockedTiles(room) }),
    [room],
  );
  const me = useQuery(api.characters.me, { token });
  const occupants = useQuery(api.world.occupants, { roomId }) ?? [];
  const messages = useQuery(api.chat.recent, { roomId }) ?? [];
  const city = useQuery(api.city.get, {});
  const move = useMutation(api.world.move);
  const localIntent = useGame((s) => s.localIntent);
  const setLocalIntent = useGame((s) => s.setLocalIntent);
  const now = useTick(1000);
  const anchors = useLabelAnchors();

  const mine = occupants.find((o) => o.characterId === me?._id);
  const serverIntent: MoveIntent | null = mine ? { path: mine.path, startedAt: mine.startedAt } : null;
  // Prefer our optimistic path until the server's newer copy lands.
  const myIntent =
    localIntent && (!serverIntent || localIntent.startedAt > serverIntent.startedAt + 250) ? localIntent : serverIntent;

  function onTileClick(x: number, y: number) {
    if (!myIntent) return;
    const from = tileAt(myIntent, serverNow());
    const path = findPath(grid, from, { x, y });
    if (!path) return;
    setLocalIntent({ path, startedAt: serverNow() });
    void move({ token, target: { x, y } });
  }

  const t = nycTime(now);
  const light = daylight(t);
  const night = light < 0.35;
  const summary = city?.weather.summary ?? "";
  const weatherKind = /snow|flurr|sleet/i.test(summary) ? "snow" : /rain|shower|drizzle|storm/i.test(summary) ? "rain" : null;

  const bubbles = new Map<string, string>();
  for (const m of messages) {
    if (serverNow() - m._creationTime < BUBBLE_MS) bubbles.set(m.characterId, m.body);
  }

  return (
    <div className="fixed inset-0 touch-none select-none">
      <Canvas shadows dpr={[1, 2]}>
        <SceneSky light={light} />
        <OrthographicCamera makeDefault position={[room.width / 2 + 20, 20, room.height / 2 + 20]} near={0.1} far={200} />
        <CameraRig cx={room.width / 2} cz={room.height / 2} span={room.width} />
        <ambientLight intensity={0.35 + light * 0.55} />
        <hemisphereLight args={["#bcd9ff", "#3a3226", 0.25 + light * 0.35]} />
        <directionalLight
          position={[room.width + 6, 16, -4]}
          intensity={0.15 + light * 1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
        />
        <Street room={room} onTileClick={onTileClick} />
        <Props room={room} night={night} />
        {occupants.map((o) => {
          const isMe = o.characterId === me?._id;
          return (
            <Avatar
              key={o.characterId}
              skin={o.look.skin}
              shirt={o.look.shirt}
              intent={isMe && myIntent ? myIntent : { path: o.path, startedAt: o.startedAt }}
              isMe={isMe}
            />
          );
        })}
        <Weather kind={weatherKind} width={room.width} depth={room.height} />
        <LabelProjector anchors={anchors} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {room.props
          .filter((p) => p.label)
          .map((p) => (
            <div key={p.id} ref={anchorRef(anchors, `prop:${p.id}`, () => propLabelPos(p))} className="absolute left-0 top-0">
              <div className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{p.label}</div>
            </div>
          ))}
        {occupants.map((o) => {
          const isMe = o.characterId === me?._id;
          const intent = isMe && myIntent ? myIntent : { path: o.path, startedAt: o.startedAt };
          const bubble = bubbles.get(o.characterId);
          return (
            <div
              key={o.characterId}
              ref={anchorRef(anchors, `avatar:${o.characterId}`, (t) => {
                const pose = poseAt(intent, t);
                return [pose.x + 0.5, 1.85, pose.y + 0.5];
              })}
              className="absolute left-0 top-0 flex flex-col items-center gap-1"
            >
              {bubble && (
                <div className="w-max max-w-[180px] rounded-xl bg-white px-2 py-1 text-center text-[11px] leading-tight text-black shadow">
                  {bubble}
                </div>
              )}
              <div className={`whitespace-nowrap rounded-full px-1.5 text-[10px] font-semibold ${isMe ? "bg-[#f3a712] text-black" : "bg-black/60 text-white"}`}>
                {o.name}
              </div>
            </div>
          );
        })}
      </div>
      <Hud token={token} roomId={roomId} me={me ?? null} city={city ?? null} clockLabel={t.label} online={occupants.length} />
    </div>
  );
}

function SceneSky({ light }: { light: number }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    get().scene.background = NIGHT_SKY.clone().lerp(DAY_SKY, light);
  }, [get, light]);
  return null;
}

/** Keeps the block framed on any screen: fit width on phones, height on desktops. */
function CameraRig({ cx, cz, span }: { cx: number; cz: number; span: number }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const { camera } = get();
    camera.lookAt(cx, 0, cz);
    if ("zoom" in camera) {
      const fit = Math.min(size.width, size.height * 1.25) / (span * 1.5);
      camera.zoom = fit;
      camera.updateProjectionMatrix();
    }
  }, [get, size, cx, cz, span]);
  return null;
}

function useTick(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
