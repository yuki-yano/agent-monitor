export type Bounds = { x: number; y: number; width: number; height: number };
export type BoundsSet = { content: Bounds | null; window: Bounds | null };

const parseBounds = (input: string): Bounds | null => {
  const parts = input
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => !Number.isNaN(value));
  if (parts.length !== 4) {
    return null;
  }
  const [x, y, width, height] = parts;
  if (x == null || y == null || width == null || height == null) {
    return null;
  }
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { x, y, width, height };
};

export const buildTerminalBoundsScript = (appName: string) => `
tell application "System Events"
  if not (exists process "${appName}") then return ""
  tell process "${appName}"
    try
      set targetWindow to front window
      set targetSubrole to "AXUnknown"
      try
        set targetSubrole to value of attribute "AXSubrole" of targetWindow
      end try
      if targetSubrole is not "AXStandardWindow" then
        set bestWindowArea to 0
        set allWindows to windows
        repeat with candidateWindow in allWindows
          try
            set candidateSubrole to value of attribute "AXSubrole" of candidateWindow
            set isMinimized to false
            try
              set isMinimized to value of attribute "AXMinimized" of candidateWindow
            end try
            if (candidateSubrole is "AXStandardWindow") and (isMinimized is false) then
              set candidateSize to value of attribute "AXSize" of candidateWindow
              set candidateArea to (item 1 of candidateSize) * (item 2 of candidateSize)
              if candidateArea > bestWindowArea then
                set bestWindowArea to candidateArea
                set targetWindow to candidateWindow
              end if
            end if
          end try
        end repeat
      end if
      set windowPos to value of attribute "AXPosition" of targetWindow
      set windowSize to value of attribute "AXSize" of targetWindow
      set contentPos to windowPos
      set contentSize to windowSize
      try
        set scrollAreas to every UI element of targetWindow whose role is "AXScrollArea"
        if (count of scrollAreas) > 0 then
          set bestPos to contentPos
          set bestSize to contentSize
          set bestArea to 0
          repeat with candidate in scrollAreas
            try
              set candidatePos to value of attribute "AXPosition" of candidate
              set candidateSize to value of attribute "AXSize" of candidate
              set candidateArea to (item 1 of candidateSize) * (item 2 of candidateSize)
              if candidateArea > bestArea then
                set bestArea to candidateArea
                set bestPos to candidatePos
                set bestSize to candidateSize
              end if
            end try
          end repeat
          if bestArea > 0 then
            set contentPos to bestPos
            set contentSize to bestSize
          end if
        end if
      end try
      return (item 1 of contentPos as text) & ", " & (item 2 of contentPos as text) & ", " & (item 1 of contentSize as text) & ", " & (item 2 of contentSize as text) & "|" & (item 1 of windowPos as text) & ", " & (item 2 of windowPos as text) & ", " & (item 1 of windowSize as text) & ", " & (item 2 of windowSize as text)
    end try
  end tell
end tell
return ""
`;

export const parseBoundsSet = (input: string): BoundsSet => {
  const [contentRaw, windowRaw] = input.split("|").map((part) => part.trim());
  const content = contentRaw ? parseBounds(contentRaw) : null;
  const window = windowRaw ? parseBounds(windowRaw) : null;
  return { content, window: window ?? content };
};
