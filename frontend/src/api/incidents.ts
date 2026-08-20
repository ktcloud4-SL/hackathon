import type {
  IncidentDetail,
  IncidentStreamEvent,
  TimelineResponse,
} from "../types/incident";
import { requestJson } from "./http";

const INCIDENT_EVENT_NAMES = [
  "agency-assigned",
  "agency-status-changed",
  "support-requested",
  "severity-changed",
  "incident-resolved",
  "incident-closed",
] as const;

export function getIncident(incidentId: number): Promise<IncidentDetail> {
  return requestJson<IncidentDetail>(`/api/incidents/${incidentId}`);
}

export function getIncidentTimeline(
  incidentId: number,
): Promise<TimelineResponse> {
  return requestJson<TimelineResponse>(`/api/incidents/${incidentId}/timeline`);
}

interface IncidentEventHandlers {
  onEvent: (event: IncidentStreamEvent) => void;
  onOpen: () => void;
  onError: () => void;
}

export function connectIncidentEvents(
  incidentId: number,
  handlers: IncidentEventHandlers,
): EventSource {
  const source = new EventSource(`/api/incidents/${incidentId}/events`, {
    withCredentials: true,
  });

  const handleEvent = (message: MessageEvent<string>) => {
    try {
      const event = JSON.parse(message.data) as IncidentStreamEvent;
      handlers.onEvent(event);
    } catch (error) {
      console.warn("알 수 없는 Incident SSE 이벤트를 무시합니다.", error);
    }
  };

  INCIDENT_EVENT_NAMES.forEach((eventName) => {
    source.addEventListener(eventName, handleEvent as EventListener);
  });

  source.onopen = handlers.onOpen;
  source.onerror = handlers.onError;

  return source;
}
