"use client";

import { OrthographicCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Color } from "three";
import {
  ACTIONS,
  ITEM_BY_ID,
  buildRoomLayout,
  goalTiles,
  normalizeLook,
  roomDef,
  type ItemDef,
  type PlacedItem,
  type Prop,
  type RoomDef,
} from "@nyl/content";
import { daylight, findPath, findPathToAny, footprintTiles, nycTime, poseAt, tileAt, weatherKind, type MoveIntent } from "@nyl/game-core";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { usePolling } from "@/lib/hooks";
import { randomId } from "@/lib/id";
import { serverNow, useGame } from "@/lib/store";
import { useSocket } from "@/lib/SocketContext";
import { useRealtimeChat, useRealtimeOccupants } from "@/lib/useRealtimeData";
import type { CharacterDoc, CityStateDoc, MessageDoc, Occupant, PlacedObjectDoc } from "@/lib/types";
import { ActionMenu } from "./ActionMenu";
import { BuildPanel, type Ghost } from "./BuildPanel";
import { Hud } from "./Hud";
import { Phone, type PhoneTab } from "./Phone";
import { Avatar, type ActivityAnchor } from "./scene/Avatar";
import { Furniture, FurniturePiece, type PlacedObject } from "./scene/Furniture";
import { Interior } from "./scene/Interior";
import { LabelProjector, anchorRef, useLabelAnchors } from "./scene/Labels";
import { NpcAvatar, npcPosition } from "./scene/Npc";
import { ParkGround } from "./scene/Park";
import { Props, propLabelPos } from "./scene/Props";
import { Street } from "./scene/Street";
import { Weather } from "./scene/Weather";

const BUBBLE_MS = 8_000;
const NPC_LINE_EVERY_MS = 24_000;
const NIGHT_SKY = new Color("#0b1020");
const DAY_SKY = new Color("#a9d2ee");
const NO_OBJECTS: PlacedObject[] = [];

/** Convert REST PlacedObjectDoc (id) to the PlacedObject shape (with _id) used by scene components. */
function toPlacedObjects(docs: PlacedObjectDoc[]): PlacedObject[] {
  return docs.map((d) => ({ _id: d.id, itemId: d.itemId, x: d.x, y: d.y, rot: d.rot }));
}

export function World({ roomId }: { roomId: string }) {
  const room = useMemo(() => roomDef(roomId)!, [roomId]);
  const isHome = room.kind === "home";
  const indoor = isHome || room.kind === "venue";

  const objectsFetcher = useCallback(() => api.objects(roomId), [roomId]);
  const rawObjects = usePolling(isHome ? objectsFetcher : null, 10000);
  const objects: PlacedObject[] = rawObjects ? toPlacedObjects(rawObjects) : NO_OBJECTS;
  // Keep raw docs for paid field access in build panel
  const rawObjectDocs = rawObjects ?? [];
  const layout = useMemo(() => buildRoomLayout(room, objects), [room, objects]);

  const { socket, connected } = useSocket();

  const meFetcher = useCallback(() => api.me(), []);
  const me = usePolling(meFetcher, 4000) as CharacterDoc | null | undefined;
  const occupants: Occupant[] = useRealtimeOccupants(roomId);
  const messages: MessageDoc[] = useRealtimeChat(roomId);
  const cityFetcher = useCallback(() => api.city(), []);
  const city = usePolling(cityFetcher, 30000) as CityStateDoc | null | undefined;

  const localIntent = useGame((s) => s.localIntent);
  const setLocalIntent = useGame((s) => s.setLocalIntent);
  const clockOffset = useGame((s) => s.clockOffset);
  const toast = useGame((s) => s.toast);
  const now = useTick(1000);
  const nowS = now + clockOffset;
  const anchors = useLabelAnchors();

  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [phoneTab, setPhoneTab] = useState<PhoneTab | null>(null);
  const [buildMode, setBuildMode] = useState(false);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [npcSay, setNpcSay] = useState<{ id: string; text: string; until: number } | null>(null);

  const mine = occupants.find((o) => o.characterId === me?.id);
  const serverIntent: MoveIntent | null = mine ? { path: mine.path, startedAt: mine.startedAt } : null;
  // Prefer our optimistic path until the server's newer copy lands.
  const myIntent =
    localIntent && (!serverIntent || localIntent.startedAt > serverIntent.startedAt + 250) ? localIntent : serverIntent;
  const standing = myIntent ? tileAt(myIntent, nowS) : null;
  const gigStep = me?.gig && me.gig.roomId === roomId ? me.gig.steps[me.gig.step] : undefined;

  const ghostValid = useMemo(() => (ghost ? canPlace(room, objects, ghost, standing) : false), [room, objects, ghost, standing]);

  function closePanels() {
    setMenuKey(null);
    setPhoneTab(null);
  }

  function walkTo(x: number, y: number) {
    if (!myIntent) return;
    const path = findPath(layout.grid, tileAt(myIntent, serverNow()), { x, y });
    if (!path) return;
    setLocalIntent({ path, startedAt: serverNow() });
    if (connected) {
      socket.emit("world:move", { target: { x, y } });
    } else {
      void api.move({ x, y }).catch((e) => toast(playerMessage(e), "error"));
    }
  }

  function onTileClick(x: number, y: number) {
    if (buildMode) {
      if (ghost) setGhost({ ...ghost, x, y });
      return;
    }
    // Tapping a lawn or dance floor opens its menu; elsewhere you just walk.
    const flat = room.props.find((p) => p.walkable && p.actions?.length && footprintTiles(p.x, p.y, p.w, p.h).some((t) => t.x === x && t.y === y));
    if (flat && !menuKey) {
      setPhoneTab(null);
      setMenuKey(`prop:${flat.id}`);
      return;
    }
    closePanels();
    walkTo(x, y);
  }

  function open(key: string) {
    if (buildMode) return;
    setPhoneTab(null);
    setMenuKey(key);
  }

  function onPickObject(o: PlacedObject) {
    if (buildMode) {
      if (!ghost) setSelectedId(o._id);
      return;
    }
    if (ITEM_BY_ID[o.itemId]?.actions.length) open(`obj:${o._id}`);
  }

  async function doAction(target: string, actionId: string, dest?: string) {
    closePanels();
    if (actionId === "ride_subway" && !dest) {
      setPhoneTab("map");
      return;
    }
    const thing = layout.interactables.get(target);
    if (myIntent && thing) {
      const path = findPathToAny(layout.grid, tileAt(myIntent, serverNow()), goalTiles(thing));
      if (path) setLocalIntent({ path, startedAt: serverNow() });
    }
    try {
      const r = await api.startActivity({ target, actionId, dest });
      if (r.trainDelayed) toast("Heads up: your line is delayed right now, in real life.", "info");
      if (target.startsWith("npc:")) {
        const npc = room.npcs?.find((n) => `npc:${n.id}` === target);
        if (npc) setNpcSay({ id: npc.id, text: npc.lines[Math.floor(Math.random() * npc.lines.length)]!, until: serverNow() + 9000 });
      }
    } catch (e) {
      setLocalIntent(null);
      toast(playerMessage(e), "error");
    }
  }

  async function confirmGhost() {
    if (!ghost) return;
    try {
      if (ghost.objectId) {
        await api.moveItem({ objectId: ghost.objectId, x: ghost.x, y: ghost.y, rot: ghost.rot });
      } else {
        await api.placeItem({ itemId: ghost.itemId, x: ghost.x, y: ghost.y, rot: ghost.rot, requestId: randomId() });
        toast(`${ITEM_BY_ID[ghost.itemId]?.name} placed`, "good");
      }
      setGhost(null);
    } catch (e) {
      toast(playerMessage(e), "error");
    }
  }

  function startPlacing(item: ItemDef) {
    const spot = firstFreeSpot(room, objects, item, standing);
    setGhost({ itemId: item.id, x: spot.x, y: spot.y, rot: 0 });
  }

  const t = nycTime(now);
  const light = indoor ? 0.85 : daylight(t);
  const night = daylight(t) < 0.35;
  const weather = indoor ? null : weatherKind(city?.weather.summary ?? "");

  const bubbles = new Map<string, string>();
  for (const m of messages) if (nowS - new Date(m.createdAt).getTime() < BUBBLE_MS) bubbles.set(m.characterId, m.body);

  const menuThing = menuKey ? layout.interactables.get(menuKey) : null;
  const menuActions = menuThing
    ? [...menuThing.actions, ...(gigStep && gigStep.target === menuKey ? [gigStep.action] : [])]
    : [];
  const selectedObj = selectedId ? objects.find((o) => o._id === selectedId) ?? null : null;
  const selectedDoc = selectedId ? rawObjectDocs.find((o) => o.id === selectedId) ?? null : null;
  const stationLines = room.station?.lines ?? [];
  const lineNote = stationLines
    .map((l) => `${l}: ${city?.subway.lines.find((x) => x.line === l)?.status ?? "?"}`)
    .join(" · ");

  return (
    <div className="fixed inset-0 touch-none select-none">
      <Canvas shadows dpr={[1, 2]}>
        <SceneSky light={light} indoor={indoor} />
        <OrthographicCamera makeDefault position={[room.width / 2 + 20, 20, room.height / 2 + 20]} near={0.1} far={200} />
        <CameraRig cx={room.width / 2} cz={room.height / 2} span={indoor ? room.width * 1.1 : room.width} />
        <ambientLight intensity={indoor ? 0.7 : 0.35 + light * 0.55} />
        <hemisphereLight args={["#bcd9ff", "#3a3226", 0.25 + light * 0.35]} />
        <directionalLight
          position={[room.width + 6, 16, room.height + 4]}
          intensity={indoor ? 0.8 : 0.15 + light * 1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
        />
        {indoor ? (
          <>
            <Interior room={room} night={night} onTileClick={onTileClick} onDoorClick={() => open("prop:door")} />
            <pointLight position={[room.width / 2, 2.4, room.height / 2]} intensity={night || room.kind === "venue" ? 8 : 3} distance={12} color={room.theme?.light ?? "#ffd9a0"} />
          </>
        ) : room.kind === "park" ? (
          <ParkGround room={room} onTileClick={onTileClick} />
        ) : (
          <Street room={room} onTileClick={onTileClick} />
        )}
        {!isHome && <Props room={room} night={night} onPick={(p: Prop) => open(`prop:${p.id}`)} />}
        {isHome && <Furniture objects={objects} onPick={onPickObject} highlight={ghost?.objectId ?? (buildMode ? selectedId : null)} />}
        {ghost && ITEM_BY_ID[ghost.itemId] && (
          <FurniturePiece item={ITEM_BY_ID[ghost.itemId]!} x={ghost.x} y={ghost.y} rot={ghost.rot} ghost valid={ghostValid} />
        )}
        {(room.npcs ?? []).map((n) => (
          <NpcAvatar key={n.id} npc={n} onPick={() => open(`npc:${n.id}`)} />
        ))}
        {occupants.map((o) => {
          const isMe = o.characterId === me?.id;
          return (
            <Avatar
              key={o.characterId}
              look={normalizeLook(o.look)}
              intent={isMe && myIntent ? myIntent : { path: o.path, startedAt: o.startedAt }}
              isMe={isMe}
              anchor={anchorFor(o.activity, layout.interactables, nowS)}
            />
          );
        })}
        <Weather kind={weather} width={room.width} depth={room.height} />
        <LabelProjector anchors={anchors} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!isHome &&
          room.props
            .filter((p) => p.label && p.kind !== "door")
            .map((p) => {
              const isGig = gigStep?.target === `prop:${p.id}`;
              return (
                <div key={p.id} ref={anchorRef(anchors, `prop:${p.id}`, () => propLabelPos(p))} className="absolute left-0 top-0 flex flex-col items-center gap-1">
                  {isGig && (
                    <div className="animate-bounce whitespace-nowrap rounded-full bg-[#f3a712] px-2 py-0.5 text-[11px] font-bold text-black shadow-lg">
                      📦 {gigStep!.label}
                    </div>
                  )}
                  <div className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${isGig ? "bg-[#f3a712] text-black" : "bg-black/70 text-white"}`}>
                    {p.label}
                  </div>
                </div>
              );
            })}
        {(room.npcs ?? []).map((n, i) => {
          const said = npcSay && npcSay.id === n.id && nowS < npcSay.until ? npcSay.text : null;
          // Each NPC says something every so often, staggered, on the shared clock.
          const slot = Math.floor((nowS + i * 7000) / NPC_LINE_EVERY_MS);
          const ambient = (nowS + i * 7000) % NPC_LINE_EVERY_MS < 7000 ? n.lines[slot % n.lines.length] : null;
          const line = said ?? ambient;
          return (
            <div
              key={n.id}
              ref={anchorRef(anchors, `npc:${n.id}`, (tNow) => {
                const p = npcPosition(n, tNow);
                return [p.x + 0.5, 1.85, p.y + 0.5];
              })}
              className="absolute left-0 top-0 flex flex-col items-center gap-1"
            >
              {line && (
                <div className="w-max max-w-[170px] rounded-xl bg-white/95 px-2 py-1 text-center text-[11px] leading-tight text-black shadow">{line}</div>
              )}
              <div className="whitespace-nowrap rounded-full bg-violet-600/80 px-1.5 text-[10px] font-semibold text-white">{n.name}</div>
            </div>
          );
        })}
        {occupants.map((o) => {
          const isMe = o.characterId === me?.id;
          const intent = isMe && myIntent ? myIntent : { path: o.path, startedAt: o.startedAt };
          const anchor = anchorFor(o.activity, layout.interactables, nowS);
          const bubble = bubbles.get(o.characterId);
          const acting = o.activity && nowS >= o.activity.startsAt ? o.activity.status : null;
          return (
            <div
              key={o.characterId}
              ref={anchorRef(anchors, `avatar:${o.characterId}`, (tNow) => {
                if (anchor?.at && tNow >= anchor.startsAt && anchor.pose !== "stand") return [anchor.at.x, anchor.at.y + 1.3, anchor.at.z];
                const pose = poseAt(intent, tNow);
                return [pose.x + 0.5, 1.85, pose.y + 0.5];
              })}
              className="absolute left-0 top-0 flex flex-col items-center gap-1"
            >
              {bubble && (
                <div className="w-max max-w-[180px] rounded-xl bg-white px-2 py-1 text-center text-[11px] leading-tight text-black shadow">{bubble}</div>
              )}
              {acting && <div className="whitespace-nowrap rounded-full bg-sky-500/90 px-1.5 text-[10px] font-semibold text-white">{acting}</div>}
              <div className={`whitespace-nowrap rounded-full px-1.5 text-[10px] font-semibold ${isMe ? "bg-[#f3a712] text-black" : "bg-black/60 text-white"}`}>
                {o.name}
              </div>
            </div>
          );
        })}
      </div>

      <Hud
        roomId={roomId}
        me={me ?? null}
        city={city ?? null}
        clockLabel={t.label}
        online={occupants.length}
        place={isHome ? "Your basement room · Crown Heights" : `${room.name} · ${room.neighborhood}`}
        neighborhoodId={room.kind === "street" || room.kind === "park" ? room.id : room.exitTo?.roomId ?? null}
        isHome={isHome}
        buildMode={buildMode}
        onToggleBuild={() => {
          setBuildMode((b) => !b);
          setGhost(null);
          setSelectedId(null);
          closePanels();
        }}
        onOpenPhone={() => {
          setMenuKey(null);
          setPhoneTab((p) => (p ? null : "map"));
        }}
        hideBottomPanels={buildMode || !!phoneTab || !!menuThing}
      />

      {menuThing && menuKey && (
        <ActionMenu
          title={menuThing.label}
          actionIds={menuActions.filter((id) => ACTIONS[id])}
          onChoose={(id) => void doAction(menuKey, id)}
          onClose={() => setMenuKey(null)}
          note={
            menuThing.actions.includes("ride_subway")
              ? `Live: ${lineNote}${me?.job ? "" : ". No job yet: Phone → Jobs."}`
              : menuKey.startsWith("npc:")
                ? room.npcs?.find((n) => `npc:${n.id}` === menuKey)?.origin === me?.origin
                  ? "You're from the same place."
                  : undefined
                : undefined
          }
        />
      )}

      {phoneTab && me && (
        <Phone
          me={me}
          city={city ?? null}
          initialTab={phoneTab}
          onClose={() => setPhoneTab(null)}
          onCallHome={() => void doAction("phone", "call_home")}
          onRide={(dest) => void doAction("prop:subway", "ride_subway", dest)}
        />
      )}

      {buildMode && me && (
        <BuildPanel
          cash={me.cash}
          ghost={ghost}
          ghostValid={ghostValid}
          selected={selectedObj ? { _id: selectedObj._id, itemId: selectedObj.itemId, paid: selectedDoc?.paid } : null}
          onPickItem={startPlacing}
          onRotate={() => ghost && setGhost({ ...ghost, rot: (ghost.rot + 1) % 4 })}
          onConfirm={() => void confirmGhost()}
          onCancelGhost={() => setGhost(null)}
          onMoveSelected={() => {
            if (!selectedObj) return;
            setGhost({ itemId: selectedObj.itemId, x: selectedObj.x, y: selectedObj.y, rot: selectedObj.rot, objectId: selectedObj._id });
            setSelectedId(null);
          }}
          onSellSelected={() => {
            if (!selectedObj) return;
            void api.sellItem(selectedObj._id)
              .then((r) => toast(r.refund ? `Sold for $${r.refund}` : "Removed", "good"))
              .catch((e) => toast(playerMessage(e), "error"));
            setSelectedId(null);
          }}
          onClose={() => {
            if (selectedId) setSelectedId(null);
            else setBuildMode(false);
          }}
        />
      )}
    </div>
  );
}

type OccupantActivity = { status: string; pose: string; startsAt: number; endsAt: number; target: string } | null;

function anchorFor(
  activity: OccupantActivity,
  interactables: ReturnType<typeof buildRoomLayout>["interactables"],
  nowS: number,
): ActivityAnchor | null {
  if (!activity) return null;
  const thing = interactables.get(activity.target);
  const pose = (activity.pose as ActivityAnchor["pose"]) ?? "stand";
  // On a lawn or dance floor you stay where you walked to; on furniture you snap to the seat.
  const seated = pose !== "stand" && thing?.seat && !thing.walkOn;
  return {
    startsAt: activity.startsAt,
    active: nowS >= activity.startsAt,
    pose: seated || (thing?.walkOn && pose !== "stand") ? pose : "stand",
    at: seated ? thing!.seat : null,
    faceTo: thing && !seated && !thing.walkOn ? thing.center : null,
  };
}

/** Client-side mirror of the server's placement rules, for the green/red ghost. */
function canPlace(room: RoomDef, objects: PlacedItem[], g: Ghost, standing: { x: number; y: number } | null): boolean {
  const item = ITEM_BY_ID[g.itemId];
  if (!item) return false;
  const tiles = footprintTiles(g.x, g.y, item.w, item.h, g.rot);
  if (tiles.some((t) => t.x < 0 || t.y < 0 || t.x >= room.width || t.y >= room.height)) return false;
  const solid = new Set<string>();
  const flat = new Set<string>();
  for (const p of room.props) for (const t of footprintTiles(p.x, p.y, p.w, p.h)) solid.add(`${t.x},${t.y}`);
  const door = room.props.find((p) => p.kind === "door");
  const doorway = door ? `${door.x + 1},${door.y}` : "";
  for (const o of objects) {
    if (o._id === g.objectId) continue;
    const other = ITEM_BY_ID[o.itemId];
    if (!other) continue;
    for (const t of footprintTiles(o.x, o.y, other.w, other.h, o.rot)) (other.walkable ? flat : solid).add(`${t.x},${t.y}`);
  }
  return tiles.every((t) => {
    const k = `${t.x},${t.y}`;
    if (item.walkable) return !flat.has(k);
    return !solid.has(k) && k !== doorway && !(standing && standing.x === t.x && standing.y === t.y);
  });
}

function firstFreeSpot(room: RoomDef, objects: PlacedItem[], item: ItemDef, standing: { x: number; y: number } | null) {
  for (let y = 1; y < room.height; y++) {
    for (let x = 1; x < room.width; x++) {
      if (canPlace(room, objects, { itemId: item.id, x, y, rot: 0 }, standing)) return { x, y };
    }
  }
  return { x: 1, y: 1 };
}

function SceneSky({ light, indoor }: { light: number; indoor: boolean }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    get().scene.background = indoor ? new Color("#1a1612") : NIGHT_SKY.clone().lerp(DAY_SKY, light);
  }, [get, light, indoor]);
  return null;
}

/** Keeps the room framed on any screen: fit width on phones, height on desktops. */
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
