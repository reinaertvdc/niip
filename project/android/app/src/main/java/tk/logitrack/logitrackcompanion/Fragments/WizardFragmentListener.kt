package tk.logitrack.logitrackcompanion.Fragments

import android.net.Uri

enum class FragmentName {
	ConnectionFragment,
	MapFragment,
	OBDFragment,
	WizardLogin,
	WizardWIFI,
	WizardWebSocket,
	WizardHotspot
}

interface WizardFragmentListener {
	fun onLogin(token: String, id: String)
	fun onLogout()

	fun onWiFiConnect()
	fun onAutoConnectChange(value: Boolean)
}