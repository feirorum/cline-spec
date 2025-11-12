# Progressive Spec Feature - Testing Guide (Phases 1-3)

**Date:** 2025-11-12
**Version:** 1.0
**Status:** Ready for Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation from Source](#installation-from-source)
4. [Phase 1 Testing: Core Services](#phase-1-testing-core-services)
5. [Phase 2 Testing: gRPC Handlers](#phase-2-testing-grpc-handlers)
6. [Phase 3 Testing: UI Components](#phase-3-testing-ui-components)
7. [End-to-End Testing Scenarios](#end-to-end-testing-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions for testing the Progressive Spec feature (Phases 1-3) from local sources. The feature enables specification tracking and management within Cline.

### What's Implemented

- **Phase 1**: Core backend services (SpecService, SpecStorage, SpecTracker, TriggerDetector)
- **Phase 2**: gRPC handlers for all spec operations
- **Phase 3**: React UI components with full navigation integration

### What's NOT Implemented Yet

- **Phase 4**: Settings UI for configuring spec behavior
- **Phase 5**: Trigger notifications and quick actions
- **Phase 6**: LLM-based spec generation
- **Phase 7**: Test generation from specs

---

## Prerequisites

### Required Software

- **Node.js**: v18 or higher
- **npm**: v8 or higher
- **VS Code**: Latest stable version
- **Git**: For cloning and managing the repository

### Verify Installation

```bash
node --version    # Should show v18.x or higher
npm --version     # Should show v8.x or higher
code --version    # Should show VS Code version
```

---

## Installation from Source

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/feirorum/cline-spec.git
cd cline-spec

# Checkout the feature branch
git checkout claude/review-spec-addon-plan-011CV2sXHtqYbCLVnxaG6tqE

# Verify you're on the correct branch
git branch --show-current
# Should show: claude/review-spec-addon-plan-011CV2sXHtqYbCLVnxaG6tqE
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# This will install all required packages including:
# - TypeScript and compilation tools
# - gRPC and protocol buffer tools
# - VS Code extension dependencies
```

**Expected output**: ~1500 packages installed successfully

### Step 3: Generate Protocol Buffers

```bash
# Generate TypeScript types from proto files
npm run protos

# This generates:
# - src/shared/proto/cline/specs.ts (TypeScript types)
# - src/generated/hosts/vscode/protobus-services.ts (gRPC handlers)
# - webview-ui/src/services/grpc-client.ts (Client SDK)
```

**Expected output**:
```
Generated ProtoBus files at:
- webview-ui/src/services/grpc-client.ts
- src/generated/hosts/vscode/protobus-service-types.ts
- src/generated/hosts/vscode/protobus-services.ts
```

### Step 4: Compile Extension

```bash
# Compile TypeScript to JavaScript
npm run compile

# This compiles both:
# - Extension backend (src/ -> dist/)
# - Webview UI (webview-ui/src/)
```

**Expected output**: No TypeScript errors, compilation successful

### Step 5: Open in VS Code

```bash
# Open the project in VS Code
code .
```

### Step 6: Run Extension

1. In VS Code, press **F5** or:
   - Open Run and Debug panel (Ctrl+Shift+D / Cmd+Shift+D)
   - Select "Run Extension" from dropdown
   - Click the green play button

2. A new VS Code window opens with the extension running (Extension Development Host)

3. In the Extension Development Host window:
   - Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
   - Type "Cline" and select any Cline command to activate the extension

**Expected behavior**: Cline sidebar opens, extension is active

---

## Phase 1 Testing: Core Services

Phase 1 implements the backend services. These are not directly visible in the UI but power all spec operations.

### Test 1.1: Verify Services Initialize

**Goal**: Confirm SpecService initializes correctly when Cline starts

**Steps**:
1. Open VS Code with the extension running (F5)
2. Open Developer Tools in the Extension Development Host:
   - Help → Toggle Developer Tools
3. Go to Console tab
4. Look for initialization logs

**Expected output**:
```
[SpecService] Initializing...
[SpecStorage] Loaded specs from state
[SpecTracker] Ready to track changes
```

**What this tests**: Backend services start without errors

### Test 1.2: Verify State Persistence

**Goal**: Confirm specs are stored and retrieved from VS Code state

**Steps**:
1. Open Developer Tools Console
2. Run this command in Console:
   ```javascript
   // Check if specs state key exists
   globalState.keys()
   ```
3. Look for 'specs' in the output

**Expected output**: Array of keys including 'specs'

**What this tests**: State management integration

---

## Phase 2 Testing: gRPC Handlers

Phase 2 implements gRPC communication between webview and extension. We'll use the Developer Console to test handlers directly.

### Test 2.1: List Specs (getSpecs)

**Goal**: Test fetching all specs via gRPC

**Steps**:
1. Open Extension Development Host
2. Open Cline sidebar (click Cline icon)
3. Open Developer Tools → Console
4. Run this command:
   ```javascript
   // Import the client
   const { SpecsServiceClient } = await import('./services/grpc-client.js')

   // Call getSpecs
   const response = await SpecsServiceClient.getSpecs({})
   console.log('Specs:', response.specs)
   ```

**Expected output**:
```javascript
Specs: []  // Empty array initially
```

**What this tests**: gRPC handler responds correctly, returns empty list when no specs exist

### Test 2.2: Add a Spec (addSpec)

**Goal**: Test creating a new spec

**Steps**:
1. In Developer Console, run:
   ```javascript
   const { SpecsServiceClient } = await import('./services/grpc-client.js')

   const newSpec = await SpecsServiceClient.addSpec({
     title: "User Authentication Test Spec",
     content: "Feature: User Login\nScenario: User logs in with valid credentials\nGiven the user is on the login page\nWhen the user enters valid credentials\nThen the user should be logged in",
     format: "gherkin",
     status: "draft",
     files: ["src/auth/login.ts"],
     tags: ["auth", "login"],
     createdBy: "user",
     source: "manual"
   })

   console.log('Created spec:', newSpec)
   ```

**Expected output**:
```javascript
Created spec: {
  id: "spec-xxxxx",  // Generated ID
  title: "User Authentication Test Spec",
  status: "draft",
  format: "gherkin",
  // ... full spec object
}
```

**What this tests**: Spec creation, ID generation, metadata handling

### Test 2.3: Retrieve Spec (getSpec)

**Goal**: Test fetching a single spec by ID

**Steps**:
1. Using the ID from Test 2.2, run:
   ```javascript
   const spec = await SpecsServiceClient.getSpec({
     specId: "spec-xxxxx"  // Use actual ID from previous test
   })

   console.log('Retrieved spec:', spec)
   ```

**Expected output**: Full spec object matching the created spec

**What this tests**: Spec retrieval by ID

### Test 2.4: Update Spec (updateSpec)

**Goal**: Test modifying an existing spec

**Steps**:
1. Run:
   ```javascript
   const updated = await SpecsServiceClient.updateSpec({
     specId: "spec-xxxxx",  // Use actual ID
     title: "Updated: User Authentication Test Spec",
     status: "active",
     tags: ["auth", "login", "security"]
   })

   console.log('Updated spec:', updated)
   ```

**Expected output**: Spec with updated fields, new updatedAt timestamp

**What this tests**: Spec updates, timestamp management

### Test 2.5: Search Specs (searchSpecs)

**Goal**: Test searching specs by query

**Steps**:
1. Run:
   ```javascript
   const results = await SpecsServiceClient.searchSpecs({
     query: "authentication"
   })

   console.log('Search results:', results.specs)
   ```

**Expected output**: Array containing the spec with "authentication" in title/content

**What this tests**: Search functionality

### Test 2.6: Delete Spec (deleteSpec)

**Goal**: Test removing a spec

**Steps**:
1. Run:
   ```javascript
   await SpecsServiceClient.deleteSpec({
     specId: "spec-xxxxx"  // Use actual ID
   })

   // Verify it's gone
   const allSpecs = await SpecsServiceClient.getSpecs({})
   console.log('Remaining specs:', allSpecs.specs)
   ```

**Expected output**: Empty array (spec deleted successfully)

**What this tests**: Spec deletion

---

## Phase 3 Testing: UI Components

Phase 3 implements the user interface. This is the most visible part of the feature.

### Test 3.1: Access Specs View

**Goal**: Verify navigation to specs view works

**Steps**:
1. Open Cline in VS Code (Extension Development Host)
2. Look at the navbar (top-right icons)
3. Click the **file-code icon** (📄 icon, between MCP and History icons)

**Expected behavior**:
- Specs view opens in full-screen overlay
- Header shows "Specifications"
- Empty state appears: "No specifications yet"
- Icon and message are centered

**Screenshot markers**:
- ✅ File-code icon visible in navbar
- ✅ Specs view opens on click
- ✅ Empty state displays correctly

### Test 3.2: Create Test Data via Console

**Goal**: Add some specs to test the UI display

**Steps**:
1. Open Developer Tools Console
2. Run this to create multiple specs:
   ```javascript
   const { SpecsServiceClient } = await import('./services/grpc-client.js')

   // Create spec 1
   await SpecsServiceClient.addSpec({
     title: "User Authentication Feature",
     content: `Feature: User Authentication

   Scenario: Successful login
     Given a registered user
     When they enter correct credentials
     Then they should be logged in

   Scenario: Failed login
     Given a user with wrong password
     When they attempt to login
     Then they should see an error`,
     format: "gherkin",
     status: "active",
     files: ["src/auth/login.ts", "src/auth/register.ts"],
     tags: ["auth", "security"],
     createdBy: "user",
     source: "manual"
   })

   // Create spec 2
   await SpecsServiceClient.addSpec({
     title: "Shopping Cart Management",
     content: `As a user
   I want to add items to my cart
   So that I can purchase multiple items at once

   Acceptance Criteria:
   - User can add items
   - Cart persists across sessions
   - User can update quantities`,
     format: "user-story",
     status: "draft",
     files: ["src/cart/cart.ts"],
     tags: ["cart", "ecommerce"],
     createdBy: "ai",
     source: "conversation"
   })

   // Create spec 3
   await SpecsServiceClient.addSpec({
     title: "Payment Processing",
     content: `Payment Gateway Integration

   Requirements:
   1. Support multiple payment methods
   2. Handle failed transactions gracefully
   3. Store payment history securely
   4. Generate receipts automatically`,
     format: "acceptance-criteria",
     status: "implemented",
     files: ["src/payments/gateway.ts", "src/payments/processor.ts", "src/payments/history.ts"],
     tags: ["payments", "critical"],
     createdBy: "user",
     source: "manual"
   })

   console.log('Created 3 test specs')
   ```

**Expected output**: "Created 3 test specs"

### Test 3.3: View Spec List

**Goal**: Verify spec list displays correctly

**Steps**:
1. Open Specs view (file-code icon in navbar)
2. Observe the list of specs

**Expected behavior**:
- Header shows "Specifications" with count "3 specs"
- Three spec cards visible
- Each card shows:
  - ✅ Title (bold, prominent)
  - ✅ Status badge (colored: green=active, gray=draft, blue=implemented)
  - ✅ Format label (gherkin/user-story/acceptance-criteria)
  - ✅ File count
  - ✅ Tags (up to 3 visible)
  - ✅ Date (when last updated)
  - ✅ Content preview (first line)

**Visual checks**:
- Status badges have different colors
- Cards have hover effect (background changes on hover)
- Layout is clean and readable

### Test 3.4: Search Specs

**Goal**: Test search filtering

**Steps**:
1. In Specs view, click the search box at top
2. Type "auth"
3. Observe results

**Expected behavior**:
- Only "User Authentication Feature" spec shows
- Other specs are filtered out
- Count updates to "1 spec"

**Additional searches to test**:
- Search "payment" → Shows Payment Processing
- Search "cart" → Shows Shopping Cart Management
- Search "security" (tag) → Shows User Authentication Feature
- Clear search → Shows all 3 specs again

### Test 3.5: Expand Spec Details

**Goal**: Test spec detail view

**Steps**:
1. In Specs view, click on "User Authentication Feature" card
2. Observe the expanded view

**Expected behavior**:
- Card expands to show full content
- Content displays in monospace code block
- Associated files section appears:
  - "Associated Files:" header
  - Two file badges: `src/auth/login.ts` and `src/auth/register.ts`
- Background of expanded card changes slightly
- Clicking again collapses it

**Repeat for other specs** to verify all expand/collapse correctly

### Test 3.6: View Different Status Badges

**Goal**: Verify status badge colors are correct

**Steps**:
1. Observe the status badges in the list:

**Expected colors**:
- "draft" (Shopping Cart) → Gray background
- "active" (User Authentication) → Green background
- "implemented" (Payment Processing) → Blue background

### Test 3.7: Close Specs View

**Goal**: Test navigation back to chat

**Steps**:
1. Click the X button (top-right corner of Specs view)

**Expected behavior**:
- Specs view closes
- Returns to chat view
- File-code icon in navbar is still visible

### Test 3.8: Reopen Specs View

**Goal**: Verify state persists

**Steps**:
1. Click file-code icon again
2. Observe specs are still there

**Expected behavior**:
- Same 3 specs visible
- Previous search query is cleared
- List shows all specs again

---

## End-to-End Testing Scenarios

### Scenario 1: Spec Lifecycle (Complete Flow)

**Goal**: Test creating, viewing, updating, and managing a spec through the UI

**Steps**:

**Step 1: Create via Console** (UI creation not yet implemented)
```javascript
const spec = await SpecsServiceClient.addSpec({
  title: "Email Notification System",
  content: "Feature: Email Notifications\nScenario: Send welcome email",
  format: "gherkin",
  status: "draft",
  files: ["src/email/sender.ts"],
  tags: ["email", "notifications"],
  createdBy: "user",
  source: "manual"
})
console.log('Created:', spec.id)
```

**Step 2: View in UI**
1. Open Specs view
2. Find "Email Notification System" in list
3. Verify it shows correctly

**Step 3: Search for it**
1. Type "email" in search
2. Verify it appears in results

**Step 4: View Details**
1. Click on the spec card
2. Verify full content displays
3. Verify file associations show

**Step 5: Update via Console**
```javascript
await SpecsServiceClient.updateSpec({
  specId: "[spec-id-from-step-1]",
  status: "active",
  tags: ["email", "notifications", "urgent"]
})
```

**Step 6: Refresh UI**
1. Close and reopen Specs view
2. Verify status changed to "active" (green badge)
3. Verify tag count shows "+1" (3rd tag)

**Step 7: Delete**
```javascript
await SpecsServiceClient.deleteSpec({
  specId: "[spec-id-from-step-1]"
})
```

**Step 8: Verify Deletion**
1. Refresh Specs view
2. Verify spec is gone from list

### Scenario 2: Multiple Specs Management

**Goal**: Test handling many specs

**Steps**:

**Step 1: Create 10 Specs**
```javascript
for (let i = 1; i <= 10; i++) {
  await SpecsServiceClient.addSpec({
    title: `Test Spec ${i}`,
    content: `Content for spec ${i}`,
    format: i % 2 === 0 ? "gherkin" : "user-story",
    status: ["draft", "active", "implemented"][i % 3],
    files: [`src/test${i}.ts`],
    tags: [`tag${i}`, "common"],
    createdBy: "user",
    source: "manual"
  })
}
```

**Step 2: View List**
1. Open Specs view
2. Verify all 10 specs show
3. Verify scrolling works if needed

**Step 3: Test Search**
1. Search "Test Spec 5" → Shows only spec 5
2. Search "common" → Shows all 10 (all have "common" tag)
3. Clear search → Shows all again

**Step 4: Check Performance**
- UI should remain responsive
- Scrolling should be smooth
- Search should be instant

### Scenario 3: Persistence Across Sessions

**Goal**: Verify specs persist after closing VS Code

**Steps**:

**Step 1: Create a Spec**
```javascript
await SpecsServiceClient.addSpec({
  title: "Persistence Test Spec",
  content: "This should persist",
  format: "free-form",
  status: "draft",
  files: [],
  tags: ["test"],
  createdBy: "user",
  source: "manual"
})
```

**Step 2: Close Extension**
1. Close Extension Development Host window
2. Stop debugging (Shift+F5)

**Step 3: Restart Extension**
1. Press F5 to start again
2. Open Cline
3. Open Specs view

**Expected behavior**:
- "Persistence Test Spec" is still visible
- All data intact (title, content, status, etc.)

**What this tests**: State persistence via VS Code globalState

---

## Troubleshooting

### Issue 1: Specs View Shows "Loading..." Forever

**Symptoms**: Specs view opens but stays on "Loading specs..."

**Possible causes**:
1. SpecService not initialized
2. gRPC handler error
3. State manager not ready

**Debug steps**:
1. Open Developer Tools Console
2. Look for errors in red
3. Check if SpecService initialized:
   ```javascript
   // Should see initialization logs
   ```

**Solutions**:
- Restart extension (Shift+F5, then F5)
- Check console for specific errors
- Verify proto files generated: `ls src/generated/hosts/vscode/`

### Issue 2: Clicking Specs Icon Does Nothing

**Symptoms**: File-code icon doesn't open Specs view

**Possible causes**:
1. Navigation not wired correctly
2. Context not updated

**Debug steps**:
1. Check Console for JavaScript errors
2. Verify icon click is registered:
   ```javascript
   // Look for click event logs
   ```

**Solutions**:
- Hard refresh webview (Ctrl+Shift+R in Extension Development Host)
- Restart extension
- Check webview-ui compiled: `ls webview-ui/dist/`

### Issue 3: Empty State Shows Even With Specs

**Symptoms**: Created specs via console but UI shows "No specifications yet"

**Possible causes**:
1. State not updating
2. gRPC response error
3. Type conversion issue

**Debug steps**:
1. Check if specs exist:
   ```javascript
   const specs = await SpecsServiceClient.getSpecs({})
   console.log('Specs count:', specs.specs.length)
   ```
2. If count > 0, it's a UI refresh issue

**Solutions**:
- Close and reopen Specs view
- Click search box and clear it (triggers re-render)
- Restart extension if persist

### Issue 4: Search Not Working

**Symptoms**: Typing in search doesn't filter specs

**Possible causes**:
1. State update not triggering
2. Filter logic error

**Debug steps**:
1. Open React DevTools (if available)
2. Check component state updates

**Solutions**:
- Try typing slowly (one letter at a time)
- Clear search and try again
- Restart extension

### Issue 5: Proto Generation Fails

**Symptoms**: `npm run protos` fails with errors

**Common errors**:

**Error**: "protoc: command not found"
```bash
# Solution: Reinstall dependencies
npm install
```

**Error**: "Cannot find module grpc-tools"
```bash
# Solution: Clean install
rm -rf node_modules package-lock.json
npm install
```

**Error**: "proto file conflicts"
```bash
# Solution: Clean generated files and regenerate
rm -rf src/generated src/shared/proto
npm run protos
```

### Issue 6: Compilation Errors

**Symptoms**: `npm run compile` fails with TypeScript errors

**Common errors**:

**Error**: "Cannot find module '@shared/proto/cline/specs'"
- **Solution**: Run `npm run protos` first

**Error**: "SpecsServiceClient not exported"
- **Solution**: Regenerate protos and recompile:
  ```bash
  npm run protos
  npm run compile
  ```

**Error**: Type mismatches
- **Solution**: Check if using correct branch:
  ```bash
  git branch --show-current
  # Should show: claude/review-spec-addon-plan-011CV2sXHtqYbCLVnxaG6tqE
  ```

### Issue 7: Extension Won't Load

**Symptoms**: F5 doesn't start Extension Development Host

**Possible causes**:
1. Build errors
2. VS Code configuration issue

**Debug steps**:
1. Check OUTPUT panel in VS Code
2. Look for extension host errors

**Solutions**:
```bash
# Clean rebuild
npm run clean  # If available
npm install
npm run protos
npm run compile

# Then try F5 again
```

### Issue 8: Specs Not Persisting

**Symptoms**: Specs disappear after restart

**Possible causes**:
1. State manager not saving
2. Storage keys mismatch

**Debug steps**:
1. Check globalState has 'specs' key
2. Verify state-helpers.ts includes specs field

**Solutions**:
- Ensure you're on correct branch
- Check `src/shared/storage/state-keys.ts` includes specs
- Verify `src/core/storage/utils/state-helpers.ts` returns specs

---

## Testing Checklist

Use this checklist to verify all features work:

### Backend (Phase 1)
- [ ] SpecService initializes without errors
- [ ] SpecStorage can save/load specs
- [ ] State persists in globalState

### gRPC Handlers (Phase 2)
- [ ] getSpecs returns empty array initially
- [ ] addSpec creates new spec with ID
- [ ] getSpec retrieves by ID
- [ ] updateSpec modifies existing spec
- [ ] deleteSpec removes spec
- [ ] searchSpecs filters correctly

### UI Components (Phase 3)
- [ ] Specs icon visible in navbar
- [ ] Clicking icon opens Specs view
- [ ] Empty state displays when no specs
- [ ] Spec list shows all specs
- [ ] Status badges show correct colors
- [ ] Search filters specs
- [ ] Clicking spec expands details
- [ ] File associations display
- [ ] Tags display (max 3 + overflow)
- [ ] Close button works
- [ ] Reopening preserves specs

### Integration
- [ ] Specs created via console appear in UI
- [ ] Search works with multiple specs
- [ ] Specs persist across restarts
- [ ] No console errors
- [ ] UI is responsive

---

## Next Steps

After completing Phase 1-3 testing, you can:

1. **Report Issues**: Document any bugs or unexpected behavior
2. **Test Edge Cases**: Try unusual inputs, very long specs, special characters
3. **Performance Testing**: Create 100+ specs and test UI responsiveness
4. **Prepare for Phase 4**: Think about settings you'd like to configure

---

## Useful Commands Reference

```bash
# Development workflow
npm install           # Install dependencies
npm run protos        # Generate proto files
npm run compile       # Compile TypeScript
code .               # Open in VS Code
# Press F5            # Run extension

# Debugging
# Developer Tools → Console in Extension Development Host

# Clean rebuild
rm -rf node_modules package-lock.json
npm install
npm run protos
npm run compile

# Check branch
git branch --show-current

# View generated files
ls src/generated/hosts/vscode/
ls src/shared/proto/cline/
ls webview-ui/src/services/grpc-client.ts
```

---

## Additional Resources

- **Cline Documentation**: https://github.com/cline/cline/blob/main/CONTRIBUTING.md
- **VS Code Extension Development**: https://code.visualstudio.com/api
- **gRPC Documentation**: https://grpc.io/docs/
- **React Testing**: https://react.dev/learn

---

**Document Version**: 1.0
**Last Updated**: 2025-11-12
**Maintained By**: Progressive Spec Implementation Team
**Status**: ✅ Ready for Testing
