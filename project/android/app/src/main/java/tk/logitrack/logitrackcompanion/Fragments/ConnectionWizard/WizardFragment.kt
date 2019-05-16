package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

import tk.logitrack.logitrackcompanion.Fragments.LongLifeFragment

abstract class WizardFragment: LongLifeFragment() {
	abstract fun setListener(listener: WizardFragmentListener)
}