# Visual Guide: Detachable Panels Feature

## UI Components Location

### Main Window - Default Layout
```
┌─────────────────────────────────────────────────────────────┐
│ learn-sdn-hub Environment                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────┬──────────────────────────┐ │
│  │ [Assignment] [Terminals]    │                          │ │
│  │          [🗗 Detach]   🔄   │   Monaco Editor          │ │
│  │ ─────────────────────────── │                          │ │
│  │                             │   - file1.p4             │ │
│  │  Lab Sheet Content:         │   - file2.py             │ │
│  │  - Instructions             │   - file3.txt            │ │
│  │  - Diagrams (Mermaid)       │                          │ │
│  │  - Step tracker             │   Code editing area...   │ │
│  │  - Submit button            │                          │ │
│  │                             │                          │ │
│  └─────────────────────────────┴──────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### After Detaching Assignment
```
Main Window:
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────┬──────────────────────────┐ │
│  │ [Assignment-disabled]       │                          │ │
│  │ [Terminals] ✓   [🗗]   🔄  │   Monaco Editor          │ │
│  │ ─────────────────────────── │                          │ │
│  │                             │   - file1.p4             │ │
│  │  Terminal Content:          │   - file2.py             │ │
│  │  [h1] [h2] [mininet]       │   - file3.txt            │ │
│  │                             │                          │ │
│  │  mininet> pingall           │   Code editing area...   │ │
│  │  *** Ping complete          │                          │ │
│  │                             │                          │ │
│  └─────────────────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Detached Window:
┌────────────────────────────────┐
│ Assignment - environment-name  │
├────────────────────────────────┤
│                                │
│  Lab Sheet Content:            │
│  # Exercise 1                  │
│  - Step 1: Configure...        │
│  - Step 2: Test...             │
│                                │
│  ┌──────────────────┐          │
│  │   Mermaid        │          │
│  │   Diagram        │          │
│  └──────────────────┘          │
│                                │
│  [Step 1] [Step 2] [Step 3]   │
│  [Finish & Submit]             │
│                                │
└────────────────────────────────┘
```

### After Detaching Terminals
```
Main Window:
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────┬──────────────────────────┐ │
│  │ [Assignment] ✓              │                          │ │
│  │ [Terminals-disabled] [🗗] 🔄│   Monaco Editor          │ │
│  │ ─────────────────────────── │                          │ │
│  │                             │   - file1.p4             │ │
│  │  Lab Sheet Content:         │   - file2.py             │ │
│  │  # Exercise 1               │   - file3.txt            │ │
│  │  - Configure switches       │                          │ │
│  │  - Test connectivity        │   Code editing area...   │ │
│  │                             │                          │ │
│  │  [Step 1] [Step 2]          │                          │ │
│  │  [Finish & Submit]          │                          │ │
│  │                             │                          │ │
│  └─────────────────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Detached Window:
┌─────────────────────────────────┐
│ Terminals - environment-name    │
├─────────────────────────────────┤
│ [h1] [h2] [mininet]            │
│                                 │
│ mininet> h1 ping h2            │
│ PING 10.0.0.2 from 10.0.0.1    │
│ 64 bytes: icmp_seq=1 ttl=64    │
│ 64 bytes: icmp_seq=2 ttl=64    │
│                                 │
│ mininet> links                  │
│ h1-eth0<->s1-eth1               │
│ h2-eth0<->s1-eth2               │
│                                 │
│ mininet> _█                     │
│                                 │
└─────────────────────────────────┘
```

## UI Button Locations

### Detach Button
- **Location**: Tab bar, between tab labels and status indicator
- **Icon**: 🗗 (OpenInNewIcon) 
- **Tooltip**: "Detach [Tab Name] to new window"
- **Action**: Opens current tab content in new window

### Reattach Button  
- **Location**: Same position as detach button
- **Icon**: ⤓ (CloseFullscreenIcon)
- **Tooltip**: "Reattach [Tab Name] to main window"
- **Action**: Closes detached window and shows content in main window

### Tab States
- **Active tab**: Blue underline, clickable
- **Inactive tab**: Gray, clickable
- **Detached tab**: Gray, disabled, with tooltip explaining it's detached

## User Workflows

### Workflow 1: View Lab Sheet + Terminals Together
1. Open assignment environment
2. Click on "Assignment" tab
3. Click detach button (🗗)
4. Assignment opens in new window
5. In main window, click "Terminals" tab
6. **Result**: Lab sheet visible in one window, terminals in main window with editor

### Workflow 2: Work on Multiple Monitors
1. Open assignment environment
2. Detach "Assignment" to secondary monitor
3. Detach "Terminals" to another position
4. **Result**: Assignment on one monitor, Terminals on another, Editor in main window

### Workflow 3: Return to Original Layout
1. With detached panels, click reattach button (⤓), OR
2. Simply close the detached window
3. **Result**: Content returns to main window in tab format

## Layout Behavior

### 3-Column Layout (Always)
```
┌──────────┬──────────┬──────────┐
│  Tabs/   │          │          │
│  Content │  Editor  │          │
│  (50%)   │  (50%)   │          │
└──────────┴──────────┴──────────┘
```

- Tabs column: Always 50% width (6/12 grid units)
- Editor column: Always 50% width (6/12 grid units)
- Detached content: Opens in separate window
- **Key**: Editor is ALWAYS visible in main window

## Browser Requirements

### Supported Browsers
- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Edge
- ✅ Safari (with popup permissions)

### Required Permissions
- **Popups**: Must be allowed for learn-sdn-hub domain
- **JavaScript**: Must be enabled
- **Cookies**: Required for session management

### Popup Blocker Settings
If detach fails:
1. Check browser popup blocker
2. Add learn-sdn-hub to allowed sites
3. Try detaching again

## Keyboard Accessibility

### Tab Navigation
- `Tab`: Navigate between controls
- `Shift+Tab`: Navigate backwards
- `Enter`: Activate detach/reattach button
- `Escape`: Close tooltips

### Best Practices
1. Use tooltips to understand tab states
2. Close detached windows when done
3. Keep editor visible for code editing
4. Arrange windows across monitors for best workflow

## Troubleshooting

### Issue: Detach button doesn't work
- **Cause**: Popup blocker
- **Solution**: Allow popups for the domain

### Issue: Styles missing in detached window
- **Cause**: Stylesheet limit (50 max)
- **Solution**: First 50 stylesheets should include all essential styles

### Issue: Tab is disabled
- **Cause**: Content is detached
- **Solution**: Click reattach button or close detached window

### Issue: Lost detached window
- **Cause**: Window moved off screen or minimized
- **Solution**: Click reattach button to bring content back to main window
