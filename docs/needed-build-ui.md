Login page: Email and password form to authenticate users via POST /api/auth/login
Registration page: Form with name, email, and password to create new accounts via POST /api/auth/register
Forgot/Reset password flow: Two-step flow to request a reset link and set a new password
User profile page/modal: Interface to manage name, bio, and preferences (theme, session length, notifications)
Auth state wrapper: React Context provider for managing JWT tokens, refresh tokens, and protecting routes
Logout button: Button in the navigation to end the session via POST /api/auth/logout
File upload support: Interface to upload markdown files via multipart/form-data for POST /api/process/upload
Real API integration (Pipeline): Logic to start real pipeline runs via POST /api/process/start-pipeline instead of simulated timeouts
SSE/WebSocket streaming: Connection handler to receive real-time progress events from the processing pipeline
Pipeline cancel button: UI control to interrupt a running pipeline via POST /api/process/pipeline/{id}/cancel
Pipeline status polling: Fallback polling mechanism for when SSE fails
Error/failure handling UI (Pipeline): Visual indicators for when a pipeline stage fails or errors out
Real data fetching (Artifacts): Logic to fetch actual artifacts instead of using MOCK_ARTIFACTS
Pagination: Controls to navigate through pages of artifacts based on limit/page parameters
Sort/filter controls: UI to sort artifacts and filter by book, chapter, or tags
Tag management: Interface to add, edit, and display tags on individual artifacts
Notes/metadata editor: Interface to add personal notes to artifacts
Delete artifact button: Flow to soft-delete an artifact with a confirmation dialog
Restore deleted artifact flow: Interface to view and restore soft-deleted artifacts within the 30-day window
Export functionality: Buttons to export artifacts to JSON, CSV, PDF, and Anki formats
Empty state UI (Artifacts): Visual state shown when the user has zero artifacts
Real data fetching (Study): Logic to start a session with fetched Q&A pairs rather than ALL_PAIRS
Artifact/source selection: Interface to choose which artifacts to study before starting a session
Study mode selection: Picker to choose between 'all', 'weak', or 'random' study modes
Time limit setting: Input to optionally configure a timer/countdown for the study session
Session persistence: API calls to record each rating (Know, Unsure, Unknown) to the server
Session completion logic: API call to finalize the session and process results when finished
Spaced repetition scheduling display: Interface showing due cards today and upcoming reviews
Session history: View to browse past completed study sessions
Mastery level display: Visual indicators showing the mastery state of individual flashcards
Analytics dashboard page: High-level view showing total stats, streaks, mastery distribution, and weekly activity
Artifact progress detail: Detailed view showing study timeline, weak areas, and next session suggestions for a specific artifact
Analytics export: Button to download the full study history as JSON/CSV
Weekly activity chart: Bar or line chart visualization showing study volume over recent days
Mastery distribution chart: Visualization of how flashcards map to mastery levels
Study streak widget: Gamification element showing current and longest consecutive study days
Performance by topic: List or chart identifying weak areas to focus on
Error boundary / toast system: Global notification system to display errors, successes, and general feedback
Loading skeletons: Fallback UI shown while data is fetching from the server
Offline indicator: Warning bar shown if the user loses network connection
Rate limit feedback: Messages informing the user to slow down when encountering a 429 Too Many Requests response
API client wrapper: Centralized fetch utility to automatically attach auth headers and handle token refreshing
