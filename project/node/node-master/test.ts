
import { ConnectivityManager } from "./connectivity-manager/connectivity-manager";

var conMan: ConnectivityManager = new ConnectivityManager("ws://localhost:8945", "wss://logitrack.tk");

// This is to stop node from closing
setInterval(() => {}, 1 << 30);