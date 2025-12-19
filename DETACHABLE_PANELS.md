# Detachable Panels Feature

## Overview

The learn-sdn-hub now supports detaching the Assignment lab sheet and Terminals panels into separate browser windows, allowing users to arrange their workspace more flexibly according to their needs.

## Features

### Detach Panels
- **Assignment Panel**: Contains the lab sheet with instructions, diagrams, and submission controls
- **Terminals Panel**: Contains all terminal tabs (SSH shells, Guacamole desktops, web apps)

### How to Use

1. **Detach a Panel**:
   - Navigate to an assignment environment
   - Click on the tab (Assignment or Terminals) you want to detach
   - Click the "Open in New" icon button (□↗) in the tab bar
   - The panel will open in a new browser window

2. **Reattach a Panel**:
   - Click the "Close Fullscreen" icon button (⤓) in the tab bar
   - The panel will return to the main window

3. **Responsive Layout**:
   - When both panels are in the main window: 50/50 split layout
   - When one panel is detached: The remaining panel expands to full width
   - Editor remains in the main window at all times

## Implementation Details

### Components

1. **DetachablePanel** (`frontend/src/components/DetachablePanel.tsx`)
   - Wrapper component that handles rendering content in external windows
   - Uses React Portals to render children in a separate browser window
   - Handles window lifecycle (open, close, cleanup)
   - Copies stylesheets from parent window to maintain consistent styling

2. **TabControl** (`frontend/src/components/TabControl.tsx`)
   - Enhanced with detach/reattach functionality
   - Tracks which tabs are currently detached
   - Displays appropriate icons (OpenInNew/CloseFullscreen) based on state
   - Disables tab switching for detached tabs

3. **Environment** (`frontend/src/views/Environment.tsx`)
   - Updated to use DetachablePanel for Assignment and Terminals content
   - Manages detach state and coordinates layout changes
   - Adjusts grid layout dynamically based on detached panel state

### Technical Features

- **Style Preservation**: All CSS styles are copied to detached windows
- **State Management**: Detached panels maintain their state when moved
- **Window Communication**: Parent window tracks detached window state
- **Graceful Degradation**: Falls back if popups are blocked
- **Cleanup**: Properly closes external windows on component unmount

## Benefits

1. **Flexible Workspace**: Users can arrange panels across multiple monitors
2. **Improved Focus**: View lab instructions while working in terminals without switching tabs
3. **Better Multi-Monitor Support**: Utilize available screen real estate effectively
4. **Preserved Functionality**: All features work the same in detached windows

## Browser Compatibility

- Requires modern browsers with popup support
- Users need to allow popups for the learn-sdn-hub domain
- Tested with Chrome, Firefox, and Edge

## Future Enhancements

Potential improvements for future versions:
- Add detach support for the Editor panel
- Remember user's layout preferences
- Add keyboard shortcuts for detach/reattach
- Support for saving window positions
