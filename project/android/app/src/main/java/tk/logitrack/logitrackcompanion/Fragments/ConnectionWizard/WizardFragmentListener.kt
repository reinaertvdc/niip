package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

interface WizardFragmentListener {
	fun onLogin(token: String, id: String)
	fun onLogout()

	fun onWiFiConnect()
	fun onAutoConnectChange(value: Boolean)

	fun onLoginReady()
	fun onWiFiReady()
	fun onWebSocketReady()
	fun onHotspotReady()
}