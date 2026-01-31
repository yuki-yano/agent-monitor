export type ScreenMode = "text" | "image";

export type ScreenLoadingState = {
  loading: boolean;
  mode: ScreenMode | null;
};

export type ScreenLoadingEvent =
  | { type: "start"; mode: ScreenMode }
  | { type: "finish"; mode: ScreenMode }
  | { type: "reset" };

export const initialScreenLoadingState: ScreenLoadingState = {
  loading: false,
  mode: null,
};

export const screenLoadingReducer = (
  state: ScreenLoadingState,
  event: ScreenLoadingEvent,
): ScreenLoadingState => {
  switch (event.type) {
    case "start":
      return { loading: true, mode: event.mode };
    case "finish":
      if (state.mode !== event.mode) {
        return state;
      }
      return initialScreenLoadingState;
    case "reset":
      return initialScreenLoadingState;
    default:
      return state;
  }
};
