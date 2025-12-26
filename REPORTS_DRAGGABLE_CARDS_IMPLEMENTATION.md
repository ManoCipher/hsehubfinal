# Reports Page - Draggable Cards Implementation

## Summary
Successfully implemented draggable and resizable cards for ALL tabs in the Reports page. All cards can now be moved by dragging and resized by dragging corners.

## Changes Made

### 1. Overview Tab
- **Improved default layout** with larger minimum heights (minH: 3 instead of 2) for better content visibility
- Cards now have more space to display content without truncation

### 2. Risk Assessments Tab
- ✅ Added draggable grid layout with ResponsiveGridLayout
- ✅ Implemented layout persistence using localStorage ('hse_layout_risk_assessments')
- ✅ Added Reset Layout button
- **Card**: Total GBU (1 card)

### 3. Audits Tab
- ✅ Added draggable grid layout with ResponsiveGridLayout
- ✅ Implemented layout persistence using localStorage ('hse_layout_audits')
- ✅ Added Reset Layout button
- **Cards**: Total Audits, Completed (2 cards)

### 4. Incidents Tab
- ✅ Added draggable grid layout with ResponsiveGridLayout
- ✅ Implemented layout persistence using localStorage ('hse_layout_incidents')
- ✅ Added Reset Layout button
- **Cards**: Total Incidents, Open Cases, Closed (3 cards)

### 5. Trainings Tab
- ✅ Added draggable grid layout with ResponsiveGridLayout
- ✅ Implemented layout persistence using localStorage ('hse_layout_trainings')
- ✅ Added Reset Layout button
- ✅ Maintained training matrix table below the cards
- **Cards**: Total Courses, Compliance Rate (2 cards)

### 6. Measures Tab
- ✅ Added draggable grid layout with ResponsiveGridLayout
- ✅ Implemented layout persistence using localStorage ('hse_layout_measures')
- ✅ Added Reset Layout button
- **Cards**: Total Measures, Completed, In Progress (3 cards)

### 7. Tasks Tab
- ✅ Added draggable grid layout with ResponsiveGridLayout
- ✅ Implemented layout persistence using localStorage ('hse_layout_tasks')
- ✅ Added Reset Layout button
- **Cards**: Total Tasks, Completed (2 cards)

### 8. Checkups Tab
- ✅ Added draggable grid layout with ResponsiveGridLayout
- ✅ Implemented layout persistence using localStorage ('hse_layout_checkups')
- ✅ Added Reset Layout button
- **Card**: Total Check-ups (1 card)

## Features Implemented

### Drag and Drop
- **Drag Handle**: Hover over any card header to see the grab cursor
- **Move Cards**: Click and drag cards to reposition them
- **Auto Layout**: Cards automatically arrange to prevent overlaps

### Resize Functionality
- **Corner Resize**: Drag any corner of a card to resize it
- **Minimum Sizes**: All cards have minimum width (2 columns) and height (3 rows)
- **Responsive Content**: Card content scales with size using CSS clamp()

### Layout Persistence
- **Auto Save**: Layouts are automatically saved to localStorage when changed
- **Per Section**: Each tab has its own layout key for independent management
- **Reset Option**: Reset Layout button restores default layout for each section

### User Guidance
- All section descriptions updated with: "Drag cards to reposition, drag corners to resize"
- Visual feedback with cursor changes on hover
- Smooth animations during drag and resize operations

## Technical Details

### Grid Configuration
```javascript
ResponsiveGridLayout:
- breakpoints: { lg: 1200, md: 996, sm: 768 }
- cols: { lg: 12, md: 10, sm: 6 }
- rowHeight: 80
- margin: [16, 16]
- draggableHandle: ".drag-handle"
```

### Card Sizes
- Small cards: w: 4, h: 3 (Risk Assessments, single cards)
- Medium cards: w: 6, h: 3 (two-card layouts)
- Large cards: w: 12, h: 5 (charts in Overview)

### LocalStorage Keys
- `hse_layout_overview` - Overview section
- `hse_layout_risk_assessments` - Risk Assessments section
- `hse_layout_audits` - Audits section
- `hse_layout_incidents` - Incidents section
- `hse_layout_trainings` - Trainings section
- `hse_layout_measures` - Measures section
- `hse_layout_tasks` - Tasks section
- `hse_layout_checkups` - Checkups section

## Testing

✅ Build successful - no TypeScript errors
✅ All sections converted from static grid to draggable layout
✅ Layout persistence working across page refreshes
✅ Reset Layout functionality working for all sections
✅ Responsive design maintained across breakpoints

## User Instructions

1. **Moving Cards**: Hover over a card header until you see the grab cursor, then click and drag to move
2. **Resizing Cards**: Hover over any corner of a card, then click and drag to resize
3. **Reset Layout**: Click the "Reset Layout" button at the top of any section to restore default positions
4. **Persistence**: Your layout changes are automatically saved and will persist across sessions

## Files Modified

- `src/pages/Reports.tsx` - Updated all section components with draggable grid layouts
  - OverviewSection: Improved default card heights
  - RiskAssessmentsSection: Added drag/resize functionality
  - AuditsSection: Added drag/resize functionality
  - IncidentsSection: Added drag/resize functionality
  - TrainingsSection: Added drag/resize functionality
  - MeasuresSection: Added drag/resize functionality
  - TasksSection: Added drag/resize functionality
  - CheckupsSection: Added drag/resize functionality
