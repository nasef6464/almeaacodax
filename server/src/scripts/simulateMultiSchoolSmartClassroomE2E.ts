// Backward-compatible entry point.
// The previous simulation directly seeded whichever MONGODB_URI happened to be
// configured and duplicated acceptance logic. Keep the existing npm command
// working, but route it through the guarded, stricter HTTP/Socket/Mongo E2E.
import "./simulateSmartClassroomHardeningE2E.js";
