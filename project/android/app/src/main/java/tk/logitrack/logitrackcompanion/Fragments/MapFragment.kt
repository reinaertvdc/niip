package tk.logitrack.logitrackcompanion.Fragments

import android.os.Bundle
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard.WizardFragmentListener

import tk.logitrack.logitrackcompanion.R

class MapFragment : LongLifeFragment() {
	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		arguments?.let {
		}
	}

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(R.layout.fragment_map, container, false)
	}

	override fun onFragmentActive() {

	}

	override fun onFragmentNonActive() {

	}

	companion object {
		@JvmStatic
		fun newInstance() =
			MapFragment().apply {
				arguments = Bundle().apply {
				}
			}
	}
}
