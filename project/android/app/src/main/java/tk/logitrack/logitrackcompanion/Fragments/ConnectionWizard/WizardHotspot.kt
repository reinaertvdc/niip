package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import tk.logitrack.logitrackcompanion.R

class WizardHotspot : WizardFragment() {
	private var listener: WizardFragmentListener? = null

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(R.layout.fragment_wizard_hotspot, container, false)
	}

	override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		if(listener != null) {
			listener!!.onHotspotReady()
		}
	}

	override fun onFragmentActive() {

	}

	override fun onFragmentNonActive() {

	}

	override fun setListener(listener: WizardFragmentListener) {
		this.listener = listener
	}

	companion object {
		@JvmStatic
		fun newInstance() =
			WizardHotspot().apply {

			}
	}
}
