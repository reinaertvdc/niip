package tk.logitrack.logitrackcompanion.Fragments

import androidx.fragment.app.Fragment

abstract class LongLifeFragment: Fragment() {
	abstract fun onFragmentActive()
	abstract fun onFragmentNonActive()
}