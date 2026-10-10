"use client";

import { MapControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Color, Fog } from "three";
import {
  ACTIONS,
  ITEM_BY_ID,
  STREET_ID,
  homeRoomDef,
  buildRoomLayout,
  goalTiles,
  normalizeLook,
  roomDef,
  type ItemDef,
  type PlacedItem,
  type Prop,
  type RoomDef,
} from "@nyl/content";
import {
  daylight,
  findPath,
  findPathToAny,
  footprintTiles,
  nycTime,
  pathDurationMs,
  poseAt,
  tileAt,
  weatherKind,
  type MoveIntent,
} from "@nyl/game-core";
import { api } from "@/lib/api";
import { playerMessage } from "@/lib/errors";
import { usePolling } from "@/lib/hooks";
import { applyOps, crossesWall, nearestEdge, wallRun, type BuildTool } from "@/lib/buildTools";
import { randomId } from "@/lib/id";
import { serverNow, useGame, type PendingGo } from "@/lib/store";
import { useSocket } from "@/lib/SocketContext";
import { useRealtimeChat, useRealtimeOccupants } from "@/lib/useRealtimeData";
import type { BuildOp, CharacterDoc, CityStateDoc, HomeDoc, MessageDoc, Occupant, PlacedObjectDoc } from "@/lib/types";
import { ActionMenu } from "./ActionMenu";
import { Backdrop } from "./scene/Backdrop";
import { cityUniforms, nightFactor, skyColor } from "./scene/palette";
import { BuildPanel, type BuildTab, type Ghost } from "./BuildPanel";
import { Hud } from "./Hud";
import { CityMap } from "./CityMap";
import { Phone, type PhoneTab } from "./Phone";
import { Avatar, type ActivityAnchor } from "./scene/Avatar";
import { Furniture, FurniturePiece, type PlacedObject } from "./scene/Furniture";
import { HomeInterior } from "./scene/HomeInterior";
import { Interior } from "./scene/Interior";
import { LabelProjector, anchorRef, useLabelAnchors } from "./scene/Labels";
import { NpcAvatar, npcPosition } from "./scene/Npc";
import { ParkGround } from "./scene/Park";
import { Props, propLabelPos } from "./scene/Props";
import { Street } from "./scene/Street";
import { STAIR_MS, stairPath } from "./scene/SubwayEntrance";
import { Weather } from "./scene/Weather";

const BUBBLE_MS = 8_000;
const NPC_LINE_EVERY_MS = 24_000;
const NO_OBJECTS: PlacedObject[] = [];

/** Convert REST PlacedObjectDoc (id) to the PlacedObject shape (with _id) used by scene components. */
function toPlacedObjects(docs: PlacedObjectDoc[]): PlacedObject[] {
  return docs.map((d) => ({ _id: d.id, itemId: d.itemId, x: d.x, y: d.y, rot: d.rot }));
}

/** A home's saved layout (walls, floors, paint), refreshed every few seconds and after you change it. */
function useHome(homeId: string | null): [HomeDoc | null, () => void] {
  const [home, setHome] = useState<HomeDoc | null>(null);
  const load = useCallback(() => {
    if (homeId) void api.homeLayout(homeId).then(setHome).catch(() => {});
  }, [homeId]);
  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);
  return [home && home.id === homeId ? home : null, load];
}

export function World({ roomId }: { roomId: string }) {
  const homeId = roomId.startsWith("home:") ? roomId.slice("home:".length) : null;
  const [home, refreshHome] = useHome(homeId);
  const room = useMemo(() => (home ? homeRoomDef(roomId, home) : roomDef(roomId)!), [roomId, home]);
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
  const pendingGo = useGame((s) => s.pendingGo);
  const emergeAt = useGame((s) => s.emergeAt);
  const [myDescend, setMyDescend] = useState<{ startsAt: number; intent: MoveIntent | null } | null>(null);
  useEffect(() => {
    useGame.setState({ lastRoomId: roomId });
  }, [roomId]);
  const setPendingGo = useGame((s) => s.setPendingGo);
  const now = useTick(1000);
  const nowS = now + clockOffset;
  const anchors = useLabelAnchors();

  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [phoneTab, setPhoneTab] = useState<PhoneTab | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [buildMode, setBuildMode] = useState(false);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [buildTab, setBuildTab] = useState<BuildTab>("buy");
  const [previewPaint, setPreviewPaint] = useState<string | null>(null);
  const [previewFloor, setPreviewFloor] = useState<string | null>(null);
  const [tool, setTool] = useState<BuildTool | null>(null);
  const [brush, setBrush] = useState("oak");
  const [pendingOps, setPendingOps] = useState<BuildOp[]>([]);
  const [dragOps, setDragOps] = useState<BuildOp[]>([]);
  const dragFrom = useRef<{ x: number; z: number } | null>(null);
  const [npcSay, setNpcSay] = useState<{ id: string; text: string; until: number } | null>(null);

  const mine = occupants.find((o) => o.characterId === me?.id);
  const serverIntent: MoveIntent | null = mine ? { path: mine.path, startedAt: mine.startedAt } : null;
  // Prefer our optimistic path until the server's newer copy lands.
  const myIntent =
    localIntent && (!serverIntent || localIntent.startedAt > serverIntent.startedAt + 250) ? localIntent : serverIntent;
  const standing = myIntent ? tileAt(myIntent, nowS) : null;
  const gigStep = me?.gig && me.gig.roomId === roomId ? me.gig.steps[me.gig.step] : undefined;

  const ghostValid = useMemo(() => (ghost ? canPlace(room, objects, ghost, standing) : false), [room, objects, ghost, standing]);
  const isOwner = !!home && !!me && home.ownerId === me.id;
  const subwayProp = room.props.find((p) => p.kind === "subway");
  const myDescendAnchor: ActivityAnchor | null =
    myDescend && subwayProp
      ? { startsAt: myDescend.startsAt, active: true, pose: "stand", at: null, faceTo: null, descend: stairPath(subwayProp) }
      : null;
  const emerge = subwayProp && emergeAt && nowS - emergeAt < STAIR_MS + 1500 ? { at: emergeAt, ...stairPath(subwayProp) } : null;
  const isLot = room.home?.kind === "lot";
  const building = buildMode && buildTab === "build" && isLot && !!tool;
  const preview = useMemo(
    () => (room.home ? applyOps(room.home.layout, [...pendingOps, ...dragOps]) : null),
    [room.home, pendingOps, dragOps],
  );
  const shownRoom = useMemo(
    () => (preview && room.home ? { ...room, home: { ...room.home, layout: preview.layout } } : room),
    [room, preview],
  );

  function resetBuild() {
    setGhost(null);
    setSelectedId(null);
    setPreviewPaint(null);
    setPreviewFloor(null);
    setTool(null);
    setPendingOps([]);
    setDragOps([]);
  }

  /** Build tools: drag walls along grid lines, tap edges for doors and windows, drag floors, tap to erase. */
  function paintTile(x: number, z: number, floorId: string | null) {
    const tx = Math.floor(x);
    const ty = Math.floor(z);
    if (!room.home || tx < 0 || ty < 0 || tx >= room.width || ty >= room.height) return;
    setPendingOps((ops) => {
      const last = ops[ops.length - 1];
      if (last?.op === "floor" && last.x === tx && last.y === ty && last.floorId === floorId) return ops;
      return [...ops, { op: "floor", x: tx, y: ty, floorId }];
    });
  }
  const buildPointer = building
    ? {
        onDown: (x: number, z: number) => {
          if (tool === "wall") {
            dragFrom.current = { x, z };
            setDragOps([]);
          } else if (tool === "door" || tool === "window") {
            const e = nearestEdge(x, z);
            setPendingOps((ops) => [...ops, { op: "add", seg: { x: e.x, y: e.y, side: e.side, kind: tool } }]);
          } else if (tool === "floor") {
            dragFrom.current = { x, z };
            paintTile(x, z, brush);
          } else if (tool === "erase") {
            const e = nearestEdge(x, z);
            const hit = preview?.layout.walls.some((w) => w.x === e.x && w.y === e.y && w.side === e.side);
            if (hit && e.dist < 0.3) setPendingOps((ops) => [...ops, { op: "remove", x: e.x, y: e.y, side: e.side }]);
            else paintTile(x, z, null);
          }
        },
        onMove: (x: number, z: number) => {
          if (!dragFrom.current) return;
          if (tool === "wall") setDragOps(wallRun(dragFrom.current, { x, z }, "wall").map((seg) => ({ op: "add" as const, seg })));
          else if (tool === "floor") paintTile(x, z, brush);
        },
        onUp: () => {
          if (tool === "wall") setPendingOps((ops) => [...ops, ...dragOps]);
          setDragOps([]);
          dragFrom.current = null;
        },
      }
    : undefined;

  async function confirmBuild() {
    try {
      const r = await api.build(pendingOps);
      setPendingOps([]);
      refreshHome();
      toast(r.cost ? `Built for $${r.cost}${r.refund ? ` (+$${r.refund} salvaged)` : ""}` : "Done", "good");
    } catch (e) {
      toast(playerMessage(e), "error");
    }
  }

  async function applyPaint(id: string) {
    try {
      await api.paintWalls(id);
      setPreviewPaint(null);
      refreshHome();
      toast("Fresh coat of paint", "good");
    } catch (e) {
      toast(playerMessage(e), "error");
    }
  }

  async function applyFloor(id: string) {
    try {
      if (isLot) {
        await api.unlockFloor(id);
        setPreviewFloor(null);
        setBrush(id);
        setBuildTab("build");
        setTool("floor");
        toast("Bought. Drag it onto your lot.", "good");
      } else {
        await api.layFloor(id);
        setPreviewFloor(null);
        refreshHome();
        toast("New floors down", "good");
      }
    } catch (e) {
      toast(playerMessage(e), "error");
    }
  }

  function closePanels() {
    setMenuKey(null);
    setPhoneTab(null);
    setMapOpen(false);
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

  /** Walk up to a thing; on arrival open its menu or start an action. */
  function walkToThing(target: string, then?: { actionId?: string }) {
    const thing = layout.interactables.get(target);
    if (!myIntent || !thing) return;
    if (then?.actionId) {
      void doAction(target, then.actionId);
      return;
    }
    const path = findPathToAny(layout.grid, tileAt(myIntent, serverNow()), goalTiles(thing));
    if (!path) return;
    setLocalIntent({ path, startedAt: serverNow() });
    void api.move(path[path.length - 1]!).catch((e) => toast(playerMessage(e), "error"));
    setTimeout(() => setMenuKey(target), pathDurationMs(path) + 150);
  }

  /** From the map: walk if it's on this block, step outside if it's right outside, otherwise ride there. */
  async function goTo(dest: PendingGo) {
    closePanels();
    if (dest.roomId === roomId) {
      walkToThing(dest.target, dest);
      return;
    }
    setPendingGo(dest);
    const ok =
      room.exitTo?.roomId === dest.roomId
        ? await doAction("prop:door", "go_out")
        : await doAction(room.station ? "prop:subway" : "door", "ride_subway", dest.roomId);
    if (!ok) setPendingGo(null);
  }

  /** Home chip on the map: a cab straight home, wherever you live. */
  function goHome() {
    closePanels();
    if (isHome && isOwner) return;
    if (!me?.homeId) return void goTo({ roomId: STREET_ID, target: "prop:walkup", actionId: "go_home" });
    void api
      .visitHome(me.homeId)
      .then(() => toast("Cab's here. Heading home.", "good"))
      .catch((e) => toast(playerMessage(e), "error"));
  }

  function goToWork() {
    const block = room.station ? room.id : room.exitTo?.roomId;
    if (!block) return;
    void goTo({ roomId: block, target: "prop:subway", actionId: "go_to_work" });
  }

  // Arrived where the map sent us: finish the trip.
  useEffect(() => {
    if (!pendingGo || pendingGo.roomId !== roomId || !myIntent) return;
    setPendingGo(null);
    walkToThing(pendingGo.target, pendingGo);
  });

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

  async function doAction(target: string, actionId: string, dest?: string): Promise<boolean> {
    closePanels();
    if (actionId === "ride_subway" && !dest) {
      setPhoneTab("map");
      return false;
    }
    const thing = layout.interactables.get(target);
    let walk: MoveIntent | null = myIntent;
    if (myIntent && thing) {
      const path = findPathToAny(layout.grid, tileAt(myIntent, serverNow()), goalTiles(thing));
      if (path) {
        walk = { path, startedAt: serverNow() };
        setLocalIntent(walk);
      }
    }
    try {
      const r = await api.startActivity({ target, actionId, dest });
      if (target === "prop:subway" && (actionId === "ride_subway" || actionId === "go_to_work")) {
        useGame.setState({ descendUntil: r.startsAt + STAIR_MS + 150 });
        setMyDescend({ startsAt: r.startsAt, intent: walk });
      }
      if (r.trainDelayed) toast("Heads up: your line is delayed right now, in real life.", "info");
      if (target.startsWith("npc:")) {
        const npc = room.npcs?.find((n) => `npc:${n.id}` === target);
        if (npc) setNpcSay({ id: npc.id, text: npc.lines[Math.floor(Math.random() * npc.lines.length)]!, until: serverNow() + 9000 });
      }
      return true;
    } catch (e) {
      setLocalIntent(null);
      toast(playerMessage(e), "error");
      return false;
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
  const dusk = nightFactor(daylight(t));
  const day = 1 - dusk;
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
      <Canvas shadows dpr={[1, 2]} gl={{ stencil: true }}>
        <SceneSky dusk={dusk} indoor={indoor} />
        <OrthographicCamera makeDefault position={[room.width / 2 + 20, 20, room.height / 2 + 20]} near={0.1} far={200} />
        <CameraRig
          key={roomId}
          cx={room.width / 2}
          cz={room.height / 2}
          span={isHome ? Math.max(room.width, room.height) * 0.85 : indoor ? room.width * 1.1 : Math.min(room.width, 18)}
          enabled={!building}
        />
        {indoor ? (
          <>
            <ambientLight color={isHome ? "#ffeedd" : "#ffffff"} intensity={isHome ? 0.6 : 0.7} />
            <hemisphereLight args={[isHome ? "#fff3e2" : "#bcd9ff", "#5a4636", 0.35 + light * 0.35]} />
          </>
        ) : (
          <>
            <ambientLight color="#c4a2d8" intensity={0.3 + day * 0.4} />
            <hemisphereLight args={["#e2c6ff", "#4a3550", 0.6 + day * 0.6]} />
          </>
        )}
        <directionalLight
          position={[room.width + 6, 14, room.height + 2]}
          color={indoor ? "#ffffff" : new Color("#b4a0ff").lerp(new Color("#ffd8c0"), day).getStyle()}
          intensity={indoor ? 0.8 : 0.45 + day * 1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
        />
        {indoor ? (
          <>
            {room.home ? (
              <HomeInterior
                room={shownRoom}
                night={night}
                wallsDown={buildMode}
                previewPaint={previewPaint}
                previewFloor={isLot ? null : previewFloor}
                pending={[...pendingOps, ...dragOps].flatMap((o) =>
                  o.op === "add" ? [{ seg: o.seg }] : o.op === "remove" ? [{ seg: { x: o.x, y: o.y, side: o.side, kind: "wall" as const }, remove: true }] : [],
                )}
                onTileClick={onTileClick}
                onDoorClick={() => open("prop:door")}
                pointer={buildPointer}
              />
            ) : (
              <Interior room={room} night={night} onTileClick={onTileClick} onDoorClick={() => open("prop:door")} />
            )}
            <pointLight position={[room.width / 2, 2.4, room.height / 2]} intensity={night || room.kind === "venue" ? 8 : 3} distance={12} color={room.theme?.light ?? "#ffd9a0"} />
          </>
        ) : room.kind === "park" ? (
          <ParkGround room={room} onTileClick={onTileClick} />
        ) : (
          <Street room={room} onTileClick={onTileClick} />
        )}
        {!indoor && <Backdrop seed={room.id} width={room.width} depth={room.height} />}
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
              anchor={isMe && myDescendAnchor ? myDescendAnchor : anchorFor(o.activity, layout.interactables, nowS, subwayProp)}
              emerge={isMe ? emerge : null}
            />
          );
        })}
        {/* Once we board, the server takes us off the street; keep drawing ourselves going down the stairs. */}
        {!mine && myDescend?.intent && myDescendAnchor && me && (
          <Avatar look={normalizeLook(me.look)} intent={myDescend.intent} isMe anchor={myDescendAnchor} />
        )}
        <Weather kind={weather} width={room.width} depth={room.height} />
        <LabelProjector anchors={anchors} />
        <EffectComposer multisampling={4} stencilBuffer>
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.3} intensity={0.85} radius={0.7} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!isHome &&
          room.props
            .filter((p) => p.label && p.kind !== "door" && !p.signless)
            .map((p) => {
              const isGig = gigStep?.target === `prop:${p.id}`;
              return (
                <div key={p.id} ref={anchorRef(anchors, `prop:${p.id}`, () => propLabelPos(p))} className="absolute left-0 top-0 flex flex-col items-center gap-1">
                  {isGig && (
                    <div className="animate-bounce whitespace-nowrap rounded-full bg-[#f3a712] px-2 py-0.5 text-[11px] font-bold text-black shadow-lg">
                      📦 {gigStep!.label}
                    </div>
                  )}
                  <div className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold shadow-md ring-1 ring-black/10 ${isGig ? "bg-[#f3a712] text-black" : "bg-white/95 text-[#1d1830]"}`}>
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
          const anchor = anchorFor(o.activity, layout.interactables, nowS, subwayProp);
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
        place={`${room.name} · ${room.neighborhood}`}
        neighborhoodId={room.kind === "street" || room.kind === "park" ? room.id : room.exitTo?.roomId ?? null}
        isHome={isHome && isOwner}
        buildMode={buildMode}
        onToggleBuild={() => {
          setBuildMode((b) => !b);
          resetBuild();
          closePanels();
        }}
        onOpenPhone={() => {
          setMenuKey(null);
          setPhoneTab((p) => (p ? null : "homes"));
        }}
        onOpenMap={() => {
          setMenuKey(null);
          setPhoneTab(null);
          setMapOpen(true);
        }}
        hideBottomPanels={buildMode || !!phoneTab || !!menuThing || mapOpen}
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

      {mapOpen && me && (
        <div className="absolute inset-0 z-40">
          <CityMap
            me={me}
            hereId={room.kind === "street" || room.kind === "park" ? room.id : room.exitTo?.roomId ?? null}
            city={city ?? null}
            onGo={(p) => void goTo({ roomId: p.roomId, target: p.target })}
            onGoHome={goHome}
            onGoToWork={goToWork}
          />
          <button
            onClick={() => setMapOpen(false)}
            aria-label="Close map"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full bg-white/95 text-lg font-semibold text-[#1d1830] shadow-lg"
          >
            ✕
          </button>
        </div>
      )}

      {phoneTab && me && (
        <Phone
          me={me}
          city={city ?? null}
          initialTab={phoneTab}
          onClose={() => setPhoneTab(null)}
          onCallHome={() => void doAction("phone", "call_home")}
          onGo={(p) => void goTo({ roomId: p.roomId, target: p.target })}
          onGoHome={goHome}
          onGoToWork={goToWork}
          hereId={room.kind === "street" || room.kind === "park" ? room.id : room.exitTo?.roomId ?? null}
        />
      )}

      {buildMode && me && room.home && (
        <BuildPanel
          cash={me.cash}
          isLot={isLot}
          unlocks={me.unlocks ?? { paints: ["cream"], floors: ["oak"] }}
          currentPaint={room.home.layout.paint}
          currentFloor={room.home.layout.baseFloor}
          tab={buildTab}
          onTab={(t) => {
            setBuildTab(t);
            setGhost(null);
            setSelectedId(null);
            if (t !== "build") setTool(null);
          }}
          previewPaint={previewPaint}
          previewFloor={previewFloor}
          onPreviewPaint={setPreviewPaint}
          onPreviewFloor={setPreviewFloor}
          onApplyPaint={(id) => void applyPaint(id)}
          onApplyFloor={(id) => void applyFloor(id)}
          tool={tool}
          onTool={setTool}
          brush={brush}
          onBrush={setBrush}
          pendingCount={pendingOps.length}
          pendingCost={preview?.cost ?? 0}
          onConfirmBuild={() => void confirmBuild()}
          onClearBuild={() => setPendingOps([])}
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
            else {
              setBuildMode(false);
              resetBuild();
            }
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
  subway?: Prop,
): ActivityAnchor | null {
  if (!activity) return null;
  // Heading for the train (a ride or the commute): walk down the stairs.
  if (subway && activity.target === "prop:subway") {
    return { startsAt: activity.startsAt, active: nowS >= activity.startsAt, pose: "stand", at: null, faceTo: null, descend: stairPath(subway) };
  }
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
  if (room.home && crossesWall(tiles, room.home.layout.walls)) return false;
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

/** Sky and fog share one color so the far city melts into it; also drives every lit window. */
function SceneSky({ dusk, indoor }: { dusk: number; indoor: boolean }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { scene } = get();
    cityUniforms.uNight.value = indoor ? 1 : dusk;
    if (indoor) {
      scene.background = new Color("#1c1428");
      scene.fog = null;
      return;
    }
    const sky = skyColor(dusk);
    scene.background = sky;
    scene.fog = new Fog(sky, 42, 85);
  }, [get, dusk, indoor]);
  return null;
}

/**
 * Frames the room on any screen (fit width on phones, height on desktops), then lets you drag to pan
 * and pinch or scroll to zoom. Turned off while you draw walls.
 */
function CameraRig({ cx, cz, span, enabled }: { cx: number; cz: number; span: number; enabled: boolean }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const fit = Math.min(size.width, size.height * 1.25) / (span * 1.5);
  useEffect(() => {
    const { camera } = get();
    if ("zoom" in camera) {
      camera.zoom = fit;
      camera.updateProjectionMatrix();
    }
  }, [get, fit]);
  return (
    <MapControls
      makeDefault
      target={[cx, 0, cz]}
      enableRotate={false}
      enabled={enabled}
      minZoom={fit * 0.6}
      maxZoom={fit * 3.5}
      zoomToCursor
      screenSpacePanning={false}
    />
  );
}

function useTick(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
