import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, Plus, Edit3, X, CheckCircle2, AlertCircle } from 'lucide-react';

export const RoadNetworkPage: React.FC = () => {
  const { locations, roads, addLocation, updateLocation, addRoadSegment } = useApp();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [, setHoveredRoad] = useState<string | null>(null);

  // Modal / Form States
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [showAddRoad, setShowAddRoad] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Location Form
  const [locName, setLocName] = useState('');
  const [locCategory, setLocCategory] = useState('Landmark');
  const [locXPercent, setLocXPercent] = useState<number>(50);
  const [locYPercent, setLocYPercent] = useState<number>(50);

  // Edit Location Form
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Landmark');
  const [editXPercent, setEditXPercent] = useState<number>(50);
  const [editYPercent, setEditYPercent] = useState<number>(50);

  // Add Road Form
  const [roadStart, setRoadStart] = useState('');
  const [roadEnd, setRoadEnd] = useState('');
  const [roadDistance, setRoadDistance] = useState<number>(3.0);
  const [roadBaseMinutes, setRoadBaseMinutes] = useState<number>(5.0);

  const closedRoads = roads.filter((r) => r.closed);
  const delayedRoads = roads.filter((r) => !r.closed && r.currentMinutes > r.baseMinutes);

  const handleOpenEdit = () => {
    const loc = locations.find((l) => l.id === selectedNode);
    if (!loc) return;
    setEditName(loc.name);
    setEditCategory(loc.zoneType);
    setEditXPercent(Math.round((loc.x / 720) * 100));
    setEditYPercent(Math.round((loc.y / 540) * 100));
    setShowEditLocation(true);
  };

  const handleAddLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) {
      setStatusMsg({ type: 'error', text: 'Location name is required.' });
      return;
    }
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const created = await addLocation({
        name: locName.trim(),
        category: locCategory,
        xCoordinatesPercent: locXPercent,
        yCoordinatesPercent: locYPercent,
      });
      setStatusMsg({ type: 'success', text: `Location "${created.name}" (${created.id}) successfully added to town network.` });
      setLocName('');
      setShowAddLocation(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add location' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !editName.trim()) {
      setStatusMsg({ type: 'error', text: 'Location name is required.' });
      return;
    }
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const updated = await updateLocation(selectedNode, {
        name: editName.trim(),
        category: editCategory,
        xCoordinatesPercent: editXPercent,
        yCoordinatesPercent: editYPercent,
      });
      setStatusMsg({ type: 'success', text: `Location "${updated.name}" (${updated.id}) updated.` });
      setShowEditLocation(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update location' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRoadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadStart || !roadEnd) {
      setStatusMsg({ type: 'error', text: 'Select both start and end locations.' });
      return;
    }
    if (roadStart === roadEnd) {
      setStatusMsg({ type: 'error', text: 'Start and end locations must be different.' });
      return;
    }
    if (roadDistance <= 0 || roadBaseMinutes <= 0) {
      setStatusMsg({ type: 'error', text: 'Distance and travel time must be positive numbers.' });
      return;
    }
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const startLoc = locations.find((l) => l.id === roadStart);
      const endLoc = locations.find((l) => l.id === roadEnd);
      const created = await addRoadSegment({
        startLocation: startLoc?.name || roadStart,
        endLocation: endLoc?.name || roadEnd,
        distanceKm: roadDistance,
        baseTravelTimeMinutes: roadBaseMinutes,
      });
      setStatusMsg({ type: 'success', text: `Road segment ${created.id} (${created.sourceId} <-> ${created.destinationId}) connected.` });
      setShowAddRoad(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add road segment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
            Nalam Nagar Road Network Graph
          </h1>
          <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
            Topological node-link representation of {locations.length} town intersections and {roads.length} road segments.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAddLocation(true); setShowAddRoad(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0E6B66] text-white text-xs font-semibold hover:bg-[#0B5450] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Location
          </button>
          <button
            onClick={() => {
              if (locations.length >= 2) {
                setRoadStart(locations[0].id);
                setRoadEnd(locations[1].id);
              }
              setShowAddRoad(true);
              setShowAddLocation(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#0E6B66] text-[#0E6B66] dark:text-[#1DB8AF] text-xs font-semibold hover:bg-[#0E6B66]/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Connect Road
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMsg && (
        <div className={`p-3.5 rounded text-xs flex items-center justify-between border ${statusMsg.type === 'success'
            ? 'bg-[#E6F3F2] dark:bg-[#16363B] border-[#0E6B66]/30 text-[#0E6B66] dark:text-[#1DB8AF]'
            : 'bg-[#FDEDEC] dark:bg-[#381A1C] border-[#F5C6CB] text-[#C62828] dark:text-[#F87171]'
          }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="font-bold underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="municipal-card p-4 border border-[#0E6B66]/40 bg-[#FAF8F5] dark:bg-[#1A202C] space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#0E6B66]" /> Add New Town Location Node
            </h3>
            <button onClick={() => setShowAddLocation(false)} className="text-[#667085] hover:text-[#1D2433]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAddLocationSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Location Name *</label>
              <input
                type="text"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="e.g. South Terminal"
                className="municipal-input w-full"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Zone Category *</label>
              <select
                value={locCategory}
                onChange={(e) => setLocCategory(e.target.value)}
                className="municipal-input w-full"
              >
                <option value="Landmark">Landmark</option>
                <option value="Junction">Junction</option>
                <option value="Transit">Transit</option>
                <option value="Hospital">Hospital</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">X Coordinate (0-100%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={locXPercent}
                onChange={(e) => setLocXPercent(Number(e.target.value))}
                className="municipal-input w-full"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Y Coordinate (0-100%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={locYPercent}
                onChange={(e) => setLocYPercent(Number(e.target.value))}
                className="municipal-input w-full"
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddLocation(false)}
                className="px-3 py-1.5 rounded border border-[#DDD8CE] text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-[#0E6B66] text-white font-semibold text-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditLocation && (
        <div className="municipal-card p-4 border border-[#0E6B66]/40 bg-[#FAF8F5] dark:bg-[#1A202C] space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8] flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#0E6B66]" /> Edit Location ({selectedNode})
            </h3>
            <button onClick={() => setShowEditLocation(false)} className="text-[#667085] hover:text-[#1D2433]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleEditLocationSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Location Name *</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="municipal-input w-full"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Zone Category *</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="municipal-input w-full"
              >
                <option value="Landmark">Landmark</option>
                <option value="Junction">Junction</option>
                <option value="Transit">Transit</option>
                <option value="Hospital">Hospital</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">X Coordinate (0-100%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editXPercent}
                onChange={(e) => setEditXPercent(Number(e.target.value))}
                className="municipal-input w-full"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Y Coordinate (0-100%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editYPercent}
                onChange={(e) => setEditYPercent(Number(e.target.value))}
                className="municipal-input w-full"
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditLocation(false)}
                className="px-3 py-1.5 rounded border border-[#DDD8CE] text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-[#0E6B66] text-white font-semibold text-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Road Segment Modal */}
      {showAddRoad && (
        <div className="municipal-card p-4 border border-[#0E6B66]/40 bg-[#FAF8F5] dark:bg-[#1A202C] space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#0E6B66]" /> Connect Road Segment
            </h3>
            <button onClick={() => setShowAddRoad(false)} className="text-[#667085] hover:text-[#1D2433]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAddRoadSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Start Location *</label>
              <select
                value={roadStart}
                onChange={(e) => setRoadStart(e.target.value)}
                className="municipal-input w-full font-mono text-xs"
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">End Location *</label>
              <select
                value={roadEnd}
                onChange={(e) => setRoadEnd(e.target.value)}
                className="municipal-input w-full font-mono text-xs"
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Distance (km) *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={roadDistance}
                onChange={(e) => setRoadDistance(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="municipal-input w-full font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Base Travel Time (mins) *</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={roadBaseMinutes}
                onChange={(e) => setRoadBaseMinutes(Math.max(0.5, parseFloat(e.target.value) || 1))}
                className="municipal-input w-full font-mono"
                required
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRoad(false)}
                className="px-3 py-1.5 rounded border border-[#DDD8CE] text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-[#0E6B66] text-white font-semibold text-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Connecting...' : 'Connect Segment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SVG Interactive Graph Map */}
      <div className="municipal-card p-4 relative overflow-hidden bg-[#FFFFFF] dark:bg-[#1E2530]">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#9BA3AF]">
              <span className="w-3 h-0.5 bg-[#0E6B66]" /> Normal Road
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#D9822B]">
              <span className="w-3 h-0.5 bg-[#D9822B]" /> Traffic Delay
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#C62828]">
              <span className="w-3 h-0.5 bg-[#C62828] stroke-dasharray" /> Closed Road (Excluded)
            </span>
          </div>

          <span className="text-[11px] font-mono text-[#667085] dark:text-[#9BA3AF]">
            {locations.length} Locations &bull; {roads.length} Segments
          </span>
        </div>

        {/* Scalable SVG Canvas */}
        <div className="w-full overflow-x-auto border border-[#DDD8CE] dark:border-[#323C4D] rounded bg-[#FAF8F5] dark:bg-[#151A22] p-2">
          <svg viewBox="0 0 720 540" className="w-full max-w-4xl mx-auto h-auto select-none">
            {/* Draw Road Edges */}
            {roads.map((road) => {
              const src = locations.find((l) => l.id === road.sourceId);
              const dst = locations.find((l) => l.id === road.destinationId);
              if (!src || !dst) return null;

              const isClosed = road.closed;
              const isDelayed = !isClosed && road.currentMinutes > road.baseMinutes;
              const strokeColor = isClosed ? '#C62828' : isDelayed ? '#D9822B' : '#0E6B66';
              const strokeDash = isClosed ? '6,4' : 'none';
              const midX = (src.x + dst.x) / 2;
              const midY = (src.y + dst.y) / 2;

              return (
                <g key={road.id} className="cursor-pointer" onMouseEnter={() => setHoveredRoad(road.id)} onMouseLeave={() => setHoveredRoad(null)}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={dst.x}
                    y2={dst.y}
                    stroke={strokeColor}
                    strokeWidth={isClosed || isDelayed ? 3 : 2}
                    strokeDasharray={strokeDash}
                    opacity={isClosed ? 0.8 : 0.65}
                  />
                  {/* Weight Badge (Travel Time in Minutes) */}
                  <rect
                    x={midX - 14}
                    y={midY - 8}
                    width={28}
                    height={16}
                    rx={3}
                    fill={isClosed ? '#FDEDEC' : isDelayed ? '#FEF6EC' : '#FFFFFF'}
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="'Inter', sans-serif"
                    fill={strokeColor}
                  >
                    {road.currentMinutes.toFixed(0)}m
                  </text>
                </g>
              );
            })}

            {/* Draw Location Nodes */}
            {locations.map((loc) => {
              const isSelected = selectedNode === loc.id;
              const isHospital = loc.zoneType === 'Hospital';
              const fill = isHospital ? '#0E6B66' : isSelected ? '#D9822B' : '#1D2433';

              return (
                <g
                  key={loc.id}
                  onClick={() => setSelectedNode(isSelected ? null : loc.id)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r={isHospital ? 14 : 10}
                    fill={fill}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  {isHospital && (
                    <text
                      x={loc.x}
                      y={loc.y + 3.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      H
                    </text>
                  )}
                  {/* Label Text */}
                  <text
                    x={loc.x}
                    y={loc.y + (isHospital ? 24 : 20)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#1D2433"
                    className="dark:fill-[#F0F4F8]"
                  >
                    {loc.name}
                  </text>
                  <text
                    x={loc.x}
                    y={loc.y + (isHospital ? 34 : 30)}
                    textAnchor="middle"
                    fontSize="8"
                    fontFamily="'Inter', sans-serif"
                    fill="#667085"
                  >
                    {loc.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Inspector */}
        {selectedNode && (
          <div className="mt-3 p-3 rounded bg-[#E6F3F2] dark:bg-[#16363B] border border-[#0E6B66]/30 text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>
                Selected Node: <strong>{locations.find((l) => l.id === selectedNode)?.name}</strong> ({selectedNode})
                &bull; Zone: {locations.find((l) => l.id === selectedNode)?.zoneType}
              </span>
              <button
                onClick={handleOpenEdit}
                className="px-2 py-0.5 rounded bg-[#0E6B66] text-white text-[11px] font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> Edit Node
              </button>
            </div>
            <button onClick={() => setSelectedNode(null)} className="font-bold underline text-[11px]">Clear</button>
          </div>
        )}
      </div>

      {/* Network Tables (Locations & Roads) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Locations List */}
        <div className="municipal-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
              Town Locations ({locations.length} Nodes)
            </h3>
            <span className="text-[11px] text-[#667085]">Click node above to edit</span>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto text-xs pr-1">
            {locations.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setSelectedNode(loc.id)}
                className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between ${selectedNode === loc.id
                    ? 'border-[#0E6B66] bg-[#E6F3F2]/50 dark:bg-[#16363B]/50'
                    : 'border-[#DDD8CE] dark:border-[#323C4D] hover:bg-[#F5F2EC] dark:hover:bg-[#252D3A]'
                  }`}
              >
                <div>
                  <span className="font-semibold text-[#1D2433] dark:text-[#F0F4F8]">{loc.name}</span>
                  <span className="text-[10px] text-[#667085] dark:text-[#9BA3AF] block font-mono">{loc.id}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#EFECE6] dark:bg-[#252D3A] text-[#1D2433] dark:text-[#F0F4F8]">
                  {loc.zoneType}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Roads Status Summary */}
        <div className="municipal-card p-4 space-y-3">
          <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8] border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            Closed & Delayed Road Segments
          </h3>
          <div className="space-y-2 text-xs">
            {closedRoads.length === 0 && delayedRoads.length === 0 ? (
              <p className="py-6 text-center text-[#667085] dark:text-[#9BA3AF]">
                All roads are currently open with nominal baseline travel times.
              </p>
            ) : (
              <>
                {closedRoads.map((r) => (
                  <div key={r.id} className="p-2 rounded bg-[#FDEDEC] dark:bg-[#381A1C] border border-[#F5C6CB] text-[#C62828] dark:text-[#F87171] flex items-center justify-between">
                    <div>
                      <strong>{r.id}:</strong> {r.sourceId} &rarr; {r.destinationId}
                      <span className="block text-[10px]">{r.closureReason || 'Closed'}</span>
                    </div>
                    <span className="font-bold font-mono">CLOSED</span>
                  </div>
                ))}

                {delayedRoads.map((r) => (
                  <div key={r.id} className="p-2 rounded bg-[#FEF6EC] dark:bg-[#381A1C] border border-[#FCE2C4] text-[#D9822B] flex items-center justify-between">
                    <div>
                      <strong>{r.id}:</strong> {r.sourceId} &rarr; {r.destinationId}
                      <span className="block text-[10px]">Baseline: {r.baseMinutes}m &rarr; Traffic: {r.currentMinutes}m</span>
                    </div>
                    <span className="font-bold font-mono">+{r.currentMinutes - r.baseMinutes}m DELAY</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default RoadNetworkPage;
