export interface ServerToClientEvent {
  message: (payload: (string | number)[]) => void;
}
