# Chichi VFX PM Agent Design

## Overview

Chichi is a PM agent for a VFX compositing artist who manages multiple projects at once. It combines a dashboard and a chat-style assistant. The first version focuses on daily work decisions: what needs attention today, which projects are at risk, and what new or changed sources arrived through Google Drive or Dropbox.

Chichi is not only a task tracker. It understands VFX production entities such as shots, plates, 3D sources, FX sources, roto sources, references, feedback, versions, delivery files, and project profit. It should help the artist avoid missing updated sources, unclear final plates, late feedback, overdue deliveries, unpaid invoices, and hidden project costs.

## Product Direction

Chichi should be built as an app with two connected modes:

- Dashboard mode: visual state of today's work, projects, and source changes.
- Chat PM mode: natural language questions and commands backed by the same project data.

The recommended first product shape is a unified dashboard with a Chichi chat panel. The dashboard gives trust and fast scanning. The chat panel lets the artist ask questions such as:

- "What should I do first today?"
- "Did any new FX source arrive?"
- "Is SH030's plate the final beauty-corrected version?"
- "Which project has the riskiest deadline?"
- "What feedback changed since yesterday?"

## First Screen

The first screen is a work command center. It intentionally excludes finance details so the opening view stays focused on production work.

### Today

Shows prioritized tasks across all active projects. Tasks include shot deadlines, feedback responses, source checks, client replies, pending deliveries, and review-ready shots.

Priority is calculated from:

- Due date and delivery date.
- Feedback urgency.
- Source readiness.
- Whether the shot is blocked by missing or uncertain source.
- Whether a delivery is waiting on the artist.

### Project Status

Shows one card per active project. Each card includes:

- Project name and client.
- Current status.
- Active shot count.
- Risk shot count.
- Pending feedback count.
- Upcoming delivery date.
- Source health summary.

Finance is not shown on these cards in the first version. It belongs in a separate finance tab.

### New And Changed Sources

Shows source updates detected from Google Drive and Dropbox. Chichi classifies each item as:

- Confirmed latest version.
- Likely latest version.
- Needs confirmation.

The source list should show newly arrived files, modified files, version bumps, moved or deleted files, and files that may affect an active shot.

## Core Data Model

### Project

Stores project-level context:

- Name.
- Client.
- Start date.
- Deadline or delivery dates.
- Status.
- Connected Google Drive folders.
- Connected Dropbox folders.
- Feedback document links.
- Shot list.
- Finance record.

### Shot

The central production object. Most Chichi data should attach to a shot.

Stores:

- Shot code.
- Project.
- Status.
- Priority.
- Due date.
- Delivery date.
- Assigned artist or freelancer.
- Current delivery version.
- Linked sources.
- Linked feedback.
- Linked tasks.

### Source File

Represents plates, 3D renders, FX renders, roto sources, references, audio, edit refs, source packages, and deliveries.

Stores:

- File name.
- Path or external URL.
- Provider: Google Drive, Dropbox, manual upload, local folder later.
- Source type: plate, 3D, FX, roto, reference, feedback media, delivery, other.
- Version.
- Modified time.
- First seen time.
- Linked project.
- Linked shot if known.
- Latest status: confirmed latest, likely latest, superseded, needs confirmation.
- Plate status if applicable: original, beauty-corrected, final, uncertain.
- Change status: new, modified, moved, deleted, unchanged.

### Feedback

Stores feedback from Google Slides, Google Sheets, PowerPoint-like documents, and KakaoTalk text or screenshots.

Stores:

- Original source.
- Original text or OCR text.
- Cleaned instruction.
- Linked project.
- Linked shot if known.
- Confidence score.
- Status: new, accepted, in progress, done, rejected, needs clarification.
- Whether it is a new request, duplicate, or change to an existing request.

### Task

Stores actionable work:

- Title.
- Project.
- Shot if applicable.
- Type: comp work, source check, feedback response, delivery, client reply, finance follow-up.
- Due date.
- Priority.
- Status.
- Blocker reason.

### Finance

Finance is a separate tab, not part of the first screen.

Tracks:

- Client income.
- Received amount.
- Unpaid amount.
- Shot or project rates.
- Additional revision fees.
- Freelancer payments.
- Business-registered contractor payments.
- Monthly AI tool costs.
- Purchased source costs.
- Other external costs.
- Estimated and actual project profit.

## Integrations

### Google Drive

Chichi watches configured Drive folders for new files, modified files, and likely version updates. It should map files to projects and shots using folder structure, file names, and user-confirmed rules.

### Dropbox

Chichi watches configured Dropbox folders with the same behavior as Google Drive.

### Google Slides, Sheets, And PowerPoint-Like Feedback

Chichi extracts feedback from text, tables, slide notes, and visible annotations where possible. Extracted feedback is linked to a shot. If the shot is unclear, Chichi marks it as needs confirmation.

### KakaoTalk

Direct automatic personal KakaoTalk reading is treated as a later or uncertain integration because it may not have a stable official path. The first version supports pasted text, exported chat text, screenshots, or manually uploaded feedback. Chichi then extracts actionable requests and links them to shots.

## Architecture

Chichi should be organized as a small set of clear subsystems:

- App shell: dashboard, navigation, finance tab, settings, and Chichi chat panel.
- Project database: stores projects, shots, files, feedback, tasks, scan snapshots, and finance records.
- Connector layer: talks to Google Drive, Dropbox, Google Sheets, Google Slides, and later other sources.
- Scanner: runs scheduled or manual scans, compares provider state against previous snapshots, and creates source change events.
- Classifier: maps source files and feedback to projects and shots using folder rules, naming rules, document context, and user confirmations.
- PM engine: turns source changes, deadlines, and feedback into prioritized tasks and dashboard alerts.
- Chat agent: answers questions and performs updates through the same database and PM engine.

The first implementation can keep these subsystems in one app, but the boundaries should stay explicit so future integrations do not make the core workflow tangled.

## Data Flow

Source monitoring flow:

1. User connects a Google Drive or Dropbox folder to a project.
2. Scanner reads file metadata and stores a scan snapshot.
3. Scanner compares the new snapshot to the previous snapshot.
4. Classifier identifies source type, possible shot, version, and latest status.
5. PM engine creates source alerts and source-check tasks when needed.
6. Dashboard and chat show the resulting state.

Feedback flow:

1. User connects or imports feedback from Slides, Sheets, PowerPoint-like documents, KakaoTalk text, screenshots, or exported chat logs.
2. Classifier extracts instructions and possible shot links.
3. Duplicate and changed feedback detection runs against existing feedback.
4. PM engine creates or updates tasks.
5. Ambiguous feedback is marked needs confirmation.

Finance flow:

1. User records income, unpaid amounts, rates, freelancer costs, contractor costs, AI costs, purchased source costs, and other external costs.
2. Chichi links finance entries to a project, and to shots where useful.
3. Finance tab calculates project-level actual profit.

## Source And Version Intelligence

Chichi should compare current scan results against previous scan snapshots. It detects:

- New source files.
- Modified source files.
- Version bumps.
- Possible source replacements.
- Deleted or moved files.
- Source files whose naming suggests they supersede older versions.

Sources should be organized around four default production source groups:

- Plate: original plates, beauty-corrected plates, clean plates, retimed plates, denoised plates, and other image sources used as the compositing base.
- 3D: CG renders, AOVs, passes, mattes, render layers, and other sources from the 3D team.
- FX: simulation renders, effect passes, particles, smoke, fire, debris, and other sources from the FX team.
- Roto: roto mattes, alpha passes, masks, tracking aids, paint aids, and other sources from roto or paint work.

Version detection should use:

- File naming patterns such as v001, v002, rev01, final, final2, beauty, denoise, retime, cleanplate.
- Folder context.
- Modified timestamps.
- Provider metadata.
- User-confirmed rules per client or project.

Chichi must distinguish facts from guesses. For example:

- "FX v004 is newer than v003" can be high confidence.
- "This appears to be the final beauty-corrected plate" is often a guess unless confirmed.
- "This source may affect SH030" should request confirmation if mapping is unclear.

## Feedback Processing

Feedback arrives in mixed forms:

- Clear shot code plus instruction.
- Image or video capture with annotations.
- KakaoTalk-style conversation.
- A mix of the above.

Chichi processes feedback in stages:

1. Extract possible instructions.
2. Identify project and shot.
3. Remove duplicates and separate changed requests.
4. Mark confidence.
5. Ask for confirmation when ambiguous.
6. Create or update tasks.

Chichi should preserve the original feedback text or image reference so the artist can check the source.

## Error Handling And Trust

Chichi should never silently pretend uncertain data is certain.

Important uncertainty states:

- Source needs confirmation.
- Shot link unclear.
- Plate finality unclear.
- Feedback duplicate uncertain.
- Version ordering unclear.
- External provider scan failed.

When uncertain, Chichi should show the issue in the dashboard and ask concise confirmation questions in chat.

## MVP Scope

The first build should include:

- Project creation.
- Shot list management.
- First screen with Today, Project Status, and New/Changed Sources.
- Google Drive and Dropbox source scan model.
- Manual or semi-manual feedback import from text and documents.
- Chichi chat panel connected to project, shot, task, feedback, and source data.
- Finance tab with project-level income, costs, unpaid amounts, and profit.

The first build does not need full automatic KakaoTalk reading. It should support pasted or exported KakaoTalk feedback first.

## Testing And Verification

The implementation should be tested against realistic VFX cases:

- A Drive or Dropbox folder receives `SH030_FX_v003` and then `SH030_FX_v004`; Chichi marks v004 as likely latest and v003 as superseded.
- A plate file contains `beauty` or `final` in the name; Chichi marks it as likely final, not confirmed final, unless the user confirms it.
- A feedback document contains clear shot codes; Chichi creates shot-linked feedback tasks.
- A KakaoTalk pasted conversation contains mixed chatter and requests; Chichi extracts only actionable feedback and flags ambiguous items.
- Multiple projects have deadlines on the same day; Chichi prioritizes today's task list across projects.
- A source file cannot be mapped to a shot; Chichi puts it in New/Changed Sources with needs confirmation.
- A provider scan fails; Chichi keeps the previous state and shows a scan failure alert.
- Finance entries include income, unpaid amount, freelancer cost, AI cost, and source purchase cost; Chichi calculates project profit.

## Out Of Scope For First Build

- Fully automatic personal KakaoTalk monitoring.
- Deep video/image analysis beyond OCR and basic attachment handling.
- Studio-scale permission management.
- Complex accounting and tax filing.
- Real-time collaboration between many artists.

## Success Criteria

Chichi is successful if the artist can:

- Open the app and know what to do first today.
- See which project or shot is at risk.
- Notice new or changed sources without manually checking every folder.
- Tell whether a source is confirmed latest or needs confirmation.
- Turn messy feedback into shot-linked tasks.
- Track income, outgoing costs, and project profit without separate manual spreadsheets.
- Ask Chichi practical PM questions and get answers based on the stored project data.
