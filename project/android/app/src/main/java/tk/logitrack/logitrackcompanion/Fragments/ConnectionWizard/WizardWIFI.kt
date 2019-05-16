package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

import android.content.Context
import android.os.Bundle
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.TextView

import tk.logitrack.logitrackcompanion.R

class WizardWIFI : WizardFragment() {
	private lateinit var parentContext: Context
	private var listener: WizardFragmentListener? = null

	private lateinit var currentWifi: TextView
	private lateinit var wantedWifi: TextView
	private lateinit var autoConnectBox: CheckBox
	private lateinit var connectButton: Button

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(R.layout.fragment_wizard_wifi, container, false)
	}

	override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		currentWifi = view.findViewById(R.id.wizard_wifi_current_wifi)
		wantedWifi = view.findViewById(R.id.wizard_wifi_wanted_wifi)

		autoConnectBox = view.findViewById(R.id.wizard_wifi_autoconnect)
		connectButton = view.findViewById(R.id.wizard_wifi_connect)

		connectButton.setOnClickListener {
			if(listener != null) {
				listener!!.onWiFiConnect()
			}
		}

		autoConnectBox.setOnCheckedChangeListener { buttonView, isChecked ->
			if(listener != null) {
				listener!!.onAutoConnectChange(isChecked)
			}
		}

		if(listener != null) {
			listener!!.onWiFiReady()
		}
	}

	override fun onAttach(context: Context?) {
		super.onAttach(context)

		if(context != null) {
			parentContext = context
		}
	}

	override fun onDetach() {
		super.onDetach()
		listener = null
	}

	override fun onFragmentActive() {

	}

	override fun onFragmentNonActive() {

	}

	override fun setListener(listener: WizardFragmentListener) {
		this.listener = listener
	}

	fun setCurrentWiFi(ssid: String) {
		if(::currentWifi.isInitialized)
			this.currentWifi.text = ssid
	}

	fun setWantedWiFi(ssid: String) {
		if(::wantedWifi.isInitialized)
			this.wantedWifi.text = ssid
	}

	fun setAutoConnect(value: Boolean) {
		if(::autoConnectBox.isInitialized)
			this.autoConnectBox.isChecked = value
	}

	companion object {
		@JvmStatic
		fun newInstance() =
			WizardWIFI().apply {
				arguments = Bundle().apply {

				}
			}
	}
}
