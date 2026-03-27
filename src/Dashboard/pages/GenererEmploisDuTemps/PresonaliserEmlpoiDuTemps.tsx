import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { useState, useEffect } from "react";
import ButtonNavigateBack from "../../../components/ButtonNavigateBack";
import { useParams } from "react-router-dom";
import api from "../../../api/apiConfig.tsx";
import PopupError from '../../../components/PopupError';
import PopupSuccess from '../../../components/PopupSuccess';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import Modal from '../../../components/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faBook, faChalkboardTeacher, faDoorOpen, faLayerGroup, faCheckCircle, faTimesCircle, faInfoCircle, faPlus } from '@fortawesome/free-solid-svg-icons';

interface Session {
  timeshot: string;
  module: string;
  formateur: string;
  salle: string;
  color: string;
}

interface Day {
  [key: string]: Session[];
}

interface TimetableGroup {
  code_branch: string;
  niveau: string;
  groupe: string;
  timetable: Day[];
  valid_form: string;
  nbr_hours_in_week: number;
  groupId: string; // Added groupId to the interface
}

// Draggable session card component
function DraggableSession({ id, children }: { id: string, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        cursor: 'grab',
        zIndex: isDragging ? 100 : 'auto',
      }}
    >
      {children}
    </div>
  );
}

// Droppable timetable cell
function DroppableCell({ id, children, onDrop }: { id: string, children: React.ReactNode, onDrop: (fromId: string, toId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <td
      ref={setNodeRef}
      style={{ background: isOver ? '#e0e7ff' : '#f9fafb', position: 'relative' }}
      className="lg:px-2 py-2 px-1 text-center border w-[12%]"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        const fromId = e.dataTransfer.getData('text/plain');
        onDrop(fromId, id);
      }}
    >
      {children}
    </td>
  );

}
// Helper to find first available slot for a module and formateur
function findFirstAvailableSlotForGroupAndFormateur(
  timetableGroup: TimetableGroup | null,
  formateurName: string,
  moduleLabel: string,
  timeShots: string[]
) {
  if (!timetableGroup) return null;
  const timetable = timetableGroup.timetable;
  for (const dayObj of timetable) {
    const dayLabel = Object.keys(dayObj)[0];
    const sessions: Session[] = Object.values(dayObj)[0];
    for (const timeshot of timeShots) {
      // Check if group already has this module at this slot
      const groupHasSession = sessions.some(s => s.timeshot === timeshot && s.module === moduleLabel);
      // Check if formateur is busy at this slot
      const formateurBusy = sessions.some(s => s.timeshot === timeshot && s.formateur === formateurName);
      if (!groupHasSession && !formateurBusy) {
        return { day: dayLabel, timeSlot: timeshot };
      }
    }
  }
  return null;
}

export default function PresonaliserEmploiDuTemps() {
  const { timetableId } = useParams();

  const timeShots = [
    "08:30-11:00",
    "11:00-13:30",
    "13:30-16:00",
    "16:00-18:30",
  ];
  const [timetableGroup, setTimetableGroup] = useState<TimetableGroup | null>(
    null
  );
  // PopupError state
  const [afficherPopupError, setAfficherPopupError] = useState(false);
  const [errors, setErrors] = useState('');
  const [afficherPopupSuccess, setAfficherPopupSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddSession, setShowAddSession] = useState(false);
  const [addSessionForm, setAddSessionForm] = useState({
    day: '',
    timeSlot: '',
    moduleId: '',
    formateurId: '',
    classroomId: '',
    type: 'présentiel',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [modules, setModules] = useState<any[]>([]);
  const [formateurs, setFormateurs] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [moduleFormateurMap, setModuleFormateurMap] = useState<{ [moduleId: string]: { formateurId: string, formateurName: string } }>({});
  const [noSlotAvailable, setNoSlotAvailable] = useState(false);

  // Fetch modules, formateurs, classrooms for dropdowns
  useEffect(() => {
    if (!timetableGroup || !timetableGroup.groupId) return;
    api.get(`/all-modules/by-group/${timetableGroup.groupId}`).then(res => {
      const allModules = res.data || [];
      setModules(allModules);
      // Build a map: moduleId -> formateurId, formateurName
      const map: { [moduleId: string]: { formateurId: string, formateurName: string } } = {};
      allModules.forEach((m: any) => {
        map[m.id] = { formateurId: m.formateurId, formateurName: m.formateur };
      });
      setModuleFormateurMap(map);
    });
    // Fetch all formateurs
    api.get('/formateurs').then(res => setFormateurs(res.data || []));
    // Fetch all classrooms
    api.get('/classrooms').then(res => setClassrooms(res.data || []));
  }, [timetableGroup]);

  // When module changes, set formateur to default for that module
  useEffect(() => {
    if (addSessionForm.moduleId && moduleFormateurMap[addSessionForm.moduleId]) {
      setAddSessionForm(f => ({ ...f, formateurId: moduleFormateurMap[addSessionForm.moduleId].formateurId }));
    }
  }, [addSessionForm.moduleId]);

  // When module changes, auto-select formateur, salle, and first available slot for both group and formateur
  useEffect(() => {
    if (!addSessionForm.moduleId) return;
    const selectedModule = modules.find(m => String(m.id) === String(addSessionForm.moduleId));
    if (!selectedModule) return;
    // Find the optimal formateur for this module
    const formateurId = moduleFormateurMap[addSessionForm.moduleId]?.formateurId || selectedModule.formateurId;

    const updates: any = {};

    // Auto-select formateur
    if (formateurId) {
      updates.formateurId = String(formateurId);
    }
    // Find the formateur object
    const selectedFormateur = formateurs.find(f => String(f.id) === String(formateurId));
    // Auto-select salle based on formateur
    if (selectedFormateur && selectedFormateur.classroomId) {
      updates.classroomId = String(selectedFormateur.classroomId);
    }
    // Find first available slot for both group and formateur
    const slot = findFirstAvailableSlotForGroupAndFormateur(
      timetableGroup,
      selectedFormateur ? selectedFormateur.name : '',
      selectedModule.label,
      timeShots
    );
    if (slot) {
      updates.day = slot.day;
      updates.timeSlot = slot.timeSlot;
      setNoSlotAvailable(false);
    } else {
      setNoSlotAvailable(true);
    }

    if (Object.keys(updates).length > 0) {
      setAddSessionForm(f => ({ ...f, ...updates }));
    }
  }, [addSessionForm.moduleId, timetableGroup, modules, formateurs]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetableGroup || !timetableGroup.groupId) {
      setAfficherPopupError(true);
      setErrors("Impossible d'ajouter la séance : le groupe n'est pas chargé.");
      return;
    }
    setIsAdding(true);
    try {
      const res = await api.post(`/group/${timetableGroup.groupId}/add-session`, addSessionForm);
      if (res.data.success) {
        setShowAddSession(false);
        setAddSessionForm({ day: '', timeSlot: '', moduleId: '', formateurId: '', classroomId: '', type: 'présentiel' });
        fetchData();
        setAfficherPopupSuccess(true);
        setSuccessMessage('Séance ajoutée avec succès !');
      }
    } catch (err: any) {
      let message = 'Erreur lors de l’ajout de la séance.';
      if (err.response?.status === 404) {
        message = "Impossible d'ajouter la séance : le groupe n'existe pas ou n'est pas valide.";
      } else if (err.response?.data?.errors) {
        message = err.response.data.errors[0] || message;
      }
      setAfficherPopupError(true);
      setErrors(message);
    } finally {
      setIsAdding(false);
    }
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // dnd-kit drag end handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;
    if (!timetableGroup) return;

    // Parse ids
    const [fromDay, fromTimeshot] = active.id.toString().split('---');
    const [toDay, toTimeshot] = over.id.toString().split('---');

    // Prevent dropping outside timetable
    if (!fromDay || !fromTimeshot || !toDay || !toTimeshot) {
      setAfficherPopupError(true);
      setErrors('Déplacement en dehors du tableau non autorisé.');
      return;
    }
    // Prevent dropping on Samedi in forbidden timeslots
    if (toDay === 'Samedi' && (toTimeshot === '13:30-16:00' || toTimeshot === '16:00-18:30')) {
      setAfficherPopupError(true);
      setErrors('Impossible d’ajouter une session à Samedi après 13:30.');
      return;
    }

    // Prepare move data for backend
    const moveData = {
      timetableId,
      from: { day: fromDay, timeshot: fromTimeshot },
      to: { day: toDay, timeshot: toTimeshot }
    };
    try {
      const res = await api.post(`/timetables/update-session-position`, moveData);
      // Use the backend's grouped/ordered timetable directly
      setTimetableGroup(res.data.updatedTimetable);
      setAfficherPopupSuccess(true);
      setSuccessMessage('Session déplacée avec succès !');
      setAfficherPopupError(false);
      setErrors('');
      // Re-fetch the latest timetable to ensure UI is up to date
      fetchData();
    } catch (err: any) {
      setAfficherPopupError(true);
      setErrors(err.response?.data?.message || 'Erreur lors du déplacement');
    }
  };

  const fetchData = async () => {
    try {
      const res = await api.get(`/timetables/${timetableId}`);

      if (res && res.data) {
        setTimetableGroup(res.data);
      }
    } catch (err) {
      // console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timetableId]);

  useEffect(() => {
    if (afficherPopupSuccess) {
      const timer = setTimeout(() => {
        setAfficherPopupSuccess(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [afficherPopupSuccess]);

  useEffect(() => {
    if (afficherPopupError) {
      const timer = setTimeout(() => {
        setAfficherPopupError(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [afficherPopupError]);

  return (
    <div className="lg:w-[93%] mx-auto  h-fit lg:px-10 lg:py-5  p-5" style={{ overflowX: 'hidden' }}>
      <div className="flex mb-10 justify-between">
        <ButtonNavigateBack />
        <button
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
          onClick={() => setShowAddSession(true)}
        >
          Ajouter une séance
        </button>
      </div>
      {/* Add Session Modal */}
      <Modal isOpen={showAddSession} onClose={() => setShowAddSession(false)}>
        <div className="text-2xl font-bold mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faPlus} className="text-green-600" />
          Ajouter une séance
        </div>
        {noSlotAvailable && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
            <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 text-xl" />
            Aucun créneau disponible pour ajouter une séance à ce module.
          </div>
        )}
        <form onSubmit={handleAddSession} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500" /> Jour
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.day} onChange={e => setAddSessionForm(f => ({ ...f, day: e.target.value }))} required>
                <option value="">Sélectionnez un jour</option>
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="text-blue-500" /> Créneau
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.timeSlot} onChange={e => setAddSessionForm(f => ({ ...f, timeSlot: e.target.value }))} required>
                <option value="">Sélectionnez un créneau</option>
                {timeShots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faBook} className="text-blue-500" /> Module
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.moduleId} onChange={e => setAddSessionForm(f => ({ ...f, moduleId: e.target.value }))} required>
                <option value="">Sélectionnez un module</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="hidden">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faChalkboardTeacher} className="text-blue-500" /> Formateur
              </label>
              <select className="mt-1.5 w-full" value={addSessionForm.formateurId} onChange={e => setAddSessionForm(f => ({ ...f, formateurId: e.target.value }))} required>
                <option value="">Choisir...</option>
                {formateurs.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.is_available !== undefined && (
                      <FontAwesomeIcon icon={f.is_available ? faCheckCircle : faTimesCircle} className={f.is_available ? 'text-green-500 ml-1' : 'text-red-500 ml-1'} />
                    )}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faDoorOpen} className="text-blue-500" /> Salle
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.classroomId} onChange={e => setAddSessionForm(f => ({ ...f, classroomId: e.target.value }))} required>
                <option value="">Sélectionnez une salle</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faLayerGroup} className="text-blue-500" /> Type
              </label>
              <select className="mt-1.5 w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none" value={addSessionForm.type} onChange={e => setAddSessionForm(f => ({ ...f, type: e.target.value }))} required>
                <option value="présentiel">Présentiel</option>
                <option value="à distance">À distance</option>
              </select>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-2 text-sm text-gray-700">
            <div className="flex items-center gap-2 font-semibold text-blue-800 mb-1">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500" />
              Résumé de la séance
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div><span className="text-gray-500">Module:</span> <span className="font-medium text-gray-900">{addSessionForm.moduleId && modules.find(m => m.id === addSessionForm.moduleId)?.label || '-'}</span></div>
              <div><span className="text-gray-500">Formateur:</span> <span className="font-medium text-gray-900">{addSessionForm.formateurId && formateurs.find(f => f.id === addSessionForm.formateurId)?.name || '-'}</span></div>
              <div><span className="text-gray-500">Salle:</span> <span className="font-medium text-gray-900">{addSessionForm.classroomId && classrooms.find(c => c.id === addSessionForm.classroomId)?.label || '-'}</span></div>
              <div><span className="text-gray-500">Horaire:</span> <span className="font-medium text-gray-900">{addSessionForm.day || '-'} {addSessionForm.timeSlot ? `(${addSessionForm.timeSlot})` : ''}</span></div>
              <div><span className="text-gray-500">Type:</span> <span className="font-medium text-gray-900">{addSessionForm.type || '-'}</span></div>
            </div>
          </div>

          <div className="flex justify-end mt-6 gap-3">
            <button type="button" className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-colors flex items-center gap-2 shadow-sm" onClick={() => setShowAddSession(false)}>
              <FontAwesomeIcon icon={faTimesCircle} />
              Annuler
            </button>
            <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={isAdding || noSlotAvailable}>
              <FontAwesomeIcon icon={faPlus} />
              {isAdding ? 'Ajout en cours...' : 'Ajouter la séance'}
            </button>
          </div>
        </form>
      </Modal>

      <div>
        <h1 className="text-center text-2xl font-bold">EMPLOI DU TEMPS</h1>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className=" font-semibold">
              EFP :{" "}
              <span className=" font-bold " style={{ color: "blue" }}>
                ISTA CITE DE L'AIR
              </span>
            </h2>
            <h2 className=" font-semibold">
              Filiére :{" "}
              <span className=" font-semibold " style={{ color: "blue" }}>
                {timetableGroup?.code_branch}
              </span>
            </h2>
            <h2 className=" font-semibold">
              Niveau :{" "}
              <span className=" font-semibold " style={{ color: "blue" }}>
                {timetableGroup?.niveau}
              </span>
            </h2>
          </div>
          <div>
            <h2 className=" font-semibold mb-5">
              Année de formation : 2024-2025
            </h2>
            <h2 className=" font-semibold">
              Groupe :{" "}
              <span className=" font-semibold " style={{ color: "blue" }}>
                {timetableGroup?.groupe}
              </span>{" "}
            </h2>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full " key={timetableGroup?.valid_form || Math.random()}>
            <thead>
              <tr>
                <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[12%]"> </th>
                {timeShots.map((timeshot) => (
                  <th style={{ background: '#9ca3af', color: '#fff' }} className="lg:px-5 lg:py-2 py-1 px-3 border w-[22%]" key={timeshot}>
                    {timeshot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timetableGroup && timetableGroup.timetable.map((day) => {
                const dayLabel = Object.keys(day)[0];
                const sessions = Array.isArray(Object.values(day)[0]) ? Object.values(day)[0] : [];
                return (
                  <tr key={dayLabel}>
                    <td style={{ background: '#6b7280', color: '#fff' }} className="lg:px-5 lg:py-7 py-5 px-3 font-bold text-center border w-[12%]">
                      {dayLabel}
                    </td>
                    {timeShots.map((timeshot) => {
                      const session = sessions.find((s: Session) => s.timeshot === timeshot);
                      const cellId = dayLabel + '---' + timeshot;
                      return (
                        <DroppableCell
                          key={cellId}
                          id={cellId}
                          onDrop={(fromId, toId) => {
                            handleDragEnd({ active: { id: fromId }, over: { id: toId } } as DragEndEvent);
                          }}
                        >
                          {session && (
                            <DraggableSession id={cellId}>
                              <div
                                style={{ background: session.color, borderRadius: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '0.5rem 1rem', border: '1px solid #e5e7eb', display: 'block', minWidth: 'unset', width: '100%', zIndex: 999 }}
                              >
                                <span style={{ color: '#111827', fontWeight: 600 }}>{session.module}</span> <br />
                                <span style={{ color: '#111827', fontWeight: 600 }}>{session.formateur}</span> <br />
                                <span style={{ color: '#111827', fontWeight: 600 }}>{session.salle}</span> <br />
                              </div>
                            </DraggableSession>
                          )}
                        </DroppableCell>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DndContext>
        <div className="flex justify-between">
          <p>
            Cet emploi du temps est valable _ partir du{" "}
            <span className=" font-semibold " style={{ color: "blue" }}>
              {timetableGroup?.valid_form}
            </span>
          </p>
          <p>
            Nombre d'heures: {" "}
            <span className=" font-semibold " style={{ color: "blue" }}>
              {(() => {
                let totalSessions = 0;
                timetableGroup?.timetable.forEach((dayObj) => {
                  const sessions = Object.values(dayObj)[0];
                  if (Array.isArray(sessions)) {
                    totalSessions += sessions.length;
                  }
                });
                return totalSessions * 2.5;
              })()}
            </span>
          </p>
        </div>
        {afficherPopupError && (
          <PopupError
            afficherPopupError={afficherPopupError}
            errors={errors}
            setAfficherPopupError={setAfficherPopupError}
          />
        )}
        {afficherPopupSuccess && (
          <PopupSuccess
            afficherPopupSuccess={afficherPopupSuccess}
            messageSuccess={successMessage}
            setAfficherPopupSuccess={setAfficherPopupSuccess}
          />
        )}
      </div>
    </div>
  );
}
