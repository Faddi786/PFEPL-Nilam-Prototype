import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { motion } from "framer-motion";

import { BarChart3, ChevronRight, Columns2, Database, Eye, FileScan, Flame, GitCompare, Grid3x3, Layers, LogOut, Network, Route, Shield, Smartphone, Sparkles, Users, Wrench } from "lucide-react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import CollapsiblePanel from "../components/CollapsiblePanel";

import LayerPanel from "../components/LayerPanel";

import MapView from "../components/MapView";

import WorkflowPanel from "../components/WorkflowPanel";

import {
  getLayerGroups,
  getThematicLayerConfigs,
  type LayerGroup,
  type RegionKey,
} from "../data/mockData";

import { logoutSession } from "../lib/auth";



const MAP_ENTRANCE_S = 2;

const EXIT_FADE_S = 0.7;

const PANEL_WIDTH = 340;

const PANEL_GAP = 12;

const PANEL_TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const };

const PANEL_SEEN_KEY = "nilam:panel-seen";

/** Set to true to show Admin in the right sidebar; /admin route remains available either way. */
const SHOW_ADMIN_IN_SIDEBAR = false;

/** Set to true to show Mutation Heatmap in the right sidebar; /heatmap route remains available either way. */
const SHOW_MUTATION_HEATMAP_IN_SIDEBAR = false;



export default function MapWorkbenchPage() {

  const navigate = useNavigate();

  const location = useLocation();

  const [showEntrance] = useState(

    () => (location.state as { entrance?: boolean } | null)?.entrance === true,

  );

  const initialLayers = useMemo(() => getLayerGroups(), []);
  const initialThematicLayers = useMemo(() => getThematicLayerConfigs(), []);

  const [region, setRegion] = useState<RegionKey>("karaikal");

  const [layerGroups, setLayerGroups] = useState<LayerGroup[]>(initialLayers);
  const [thematicLayers, setThematicLayers] = useState(initialThematicLayers);

  const [activeBasemap, setActiveBasemap] = useState("basemap-carto");

  const [layersOpen, setLayersOpen] = useState(false);

  const [workflowsOpen, setWorkflowsOpen] = useState(false);

  const [panelOpen, setPanelOpen] = useState(() => {
    const entrance = (location.state as { entrance?: boolean } | null)?.entrance === true;
    return !entrance;
  });

  const [exiting, setExiting] = useState(false);

  const exitTimerRef = useRef<number | null>(null);



  useEffect(() => {

    if (!showEntrance) return;

    navigate(location.pathname, { replace: true, state: {} });

  }, [showEntrance, navigate, location.pathname]);



  useEffect(() => {

    if (showEntrance) {

      sessionStorage.setItem(PANEL_SEEN_KEY, "1");

    }

  }, [showEntrance]);



  useEffect(() => {

    return () => {

      if (exitTimerRef.current !== null) {

        window.clearTimeout(exitTimerRef.current);

      }

    };

  }, []);



  const navigateToMobile = useCallback(() => {

    if (exiting) return;

    setExiting(true);

    exitTimerRef.current = window.setTimeout(() => {

      navigate("/mobile", { state: { entrance: true } });

    }, EXIT_FADE_S * 1000);

  }, [exiting, navigate]);



  function toggleLayer(layerId: string, visible: boolean) {

    setLayerGroups((prev) =>

      prev.map((group) => ({

        ...group,

        layers: group.layers.map((layer) => (layer.id === layerId ? { ...layer, visible } : layer)),

      })),

    );

  }

  function toggleThematicLayer(layerId: string, visible: boolean) {
    setThematicLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible } : layer)),
    );
  }



  function setBasemap(id: string) {
    setActiveBasemap(id);
  }



  return (

    <motion.div

      className="flex h-screen overflow-hidden bg-[#F7F7F5] p-3 text-[#1A1A1A] lg:p-4"

      animate={{ opacity: exiting ? 0 : 1 }}

      transition={{ duration: EXIT_FADE_S, ease: "easeInOut" }}

      style={{ pointerEvents: exiting ? "none" : "auto" }}

    >

      <div className="mx-auto flex h-full w-full max-w-[1700px] min-h-0">

        <motion.div

          className="min-h-0 shrink-0 overflow-hidden"

          initial={false}

          animate={{

            width: panelOpen ? `calc(100% - ${PANEL_WIDTH + PANEL_GAP}px)` : "100%",

          }}

          transition={PANEL_TRANSITION}

        >

          <motion.div

            className="h-full min-h-0"

            initial={{ opacity: showEntrance ? 0 : 1 }}

            animate={{ opacity: 1 }}

            transition={{ duration: showEntrance ? MAP_ENTRANCE_S : 0, ease: "easeOut" }}

          >

            <MapView

              regionKey={region}

              layerGroups={layerGroups}

              thematicLayers={thematicLayers}

              onToggleThematicLayer={toggleThematicLayer}

              basemapId={activeBasemap}

              onBasemapChange={setBasemap}

              panelOpen={panelOpen}

              onTogglePanel={() => setPanelOpen((open) => !open)}

            />

          </motion.div>

        </motion.div>



        <motion.aside

          className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"

          initial={false}

          animate={{

            width: panelOpen ? PANEL_WIDTH : 0,

            marginLeft: panelOpen ? PANEL_GAP : 0,

            opacity: panelOpen ? 1 : 0,

          }}

          transition={PANEL_TRANSITION}

          style={{ pointerEvents: panelOpen ? "auto" : "none" }}

        >

          <div className="flex w-[340px] min-h-0 flex-1 flex-col">

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">

              <CollapsiblePanel

                title="Layers"

                icon={<Layers className="h-4 w-4" />}

                open={layersOpen}

                onToggle={() => setLayersOpen((v) => !v)}

              >

                <LayerPanel
                  layerGroups={layerGroups}
                  activeRegion={region}
                  onRegionChange={setRegion}
                  onToggleLayer={toggleLayer}
                />

              </CollapsiblePanel>



              <Link

                to="/database"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Database className="h-4 w-4 text-slate-600" />

                  Database Explorer

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              <CollapsiblePanel

                title="Workflows"

                icon={<Route className="h-4 w-4" />}

                open={workflowsOpen}

                onToggle={() => setWorkflowsOpen((v) => !v)}

              >

                <WorkflowPanel />

              </CollapsiblePanel>



              <Link

                to="/reports"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <BarChart3 className="h-4 w-4 text-slate-600" />

                  Reports

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              <button

                type="button"

                onClick={navigateToMobile}

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Smartphone className="h-4 w-4 text-slate-600" />

                  Nilam Mobile

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </button>



              <Link

                to="/fmb-automation"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <FileScan className="h-4 w-4 text-slate-600" />

                  FMB Automation

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              <Link

                to="/nil-ai"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Sparkles className="h-4 w-4 text-slate-600" />

                  NIL-AI

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              <Link

                to="/citizen"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Users className="h-4 w-4 text-slate-600" />

                  Citizen Portal

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              {SHOW_ADMIN_IN_SIDEBAR && (
                <Link

                  to="/admin"

                  className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

                >

                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                    <Shield className="h-4 w-4 text-slate-600" />

                    Admin

                  </span>

                  <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

                </Link>
              )}



              <Link

                to="/monitor"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Eye className="h-4 w-4 text-slate-600" />

                  Monitor - Eye

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              <Link

                to="/architecture"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Network className="h-4 w-4 text-slate-600" />

                  Scale Architecture

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              <Link

                to="/warp"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Grid3x3 className="h-4 w-4 text-slate-600" />

                  Georeferencing

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              <Link

                to="/transformation"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <GitCompare className="h-4 w-4 text-slate-600" />

                  Transform Tools

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              <Link

                to="/swipe"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Columns2 className="h-4 w-4 text-slate-600" />

                  Swipe Compare

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>



              {SHOW_MUTATION_HEATMAP_IN_SIDEBAR && (
                <Link

                  to="/heatmap"

                  className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

                >

                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                    <Flame className="h-4 w-4 text-slate-600" />

                    Mutation Heatmap

                  </span>

                  <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

                </Link>
              )}



              <Link

                to="/more-tools"

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <Wrench className="h-4 w-4 text-slate-600" />

                  More Tools

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </Link>

            </div>

            <div className="shrink-0 border-t border-slate-100 p-3">

              <button

                type="button"

                onClick={() => {

                  logoutSession();

                  navigate("/login", { replace: true });

                }}

                className="group flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:border-slate-200 hover:bg-white"

              >

                <span className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">

                  <LogOut className="h-4 w-4 text-slate-600" />

                  Logout

                </span>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />

              </button>

            </div>

          </div>

        </motion.aside>

      </div>

    </motion.div>

  );

}

