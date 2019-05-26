package tk.logitrack.logitrackcompanion.Fragments.ConnectionWizard

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.ProgressBar
import android.widget.TextView
import com.firebase.ui.auth.AuthUI

import tk.logitrack.logitrackcompanion.R

/**
 * A simple [Fragment] subclass.
 * Activities that contain this fragment must implement the
 * [WizardLogin.OnFragmentInteractionListener] interface
 * to handle interaction events.
 * Use the [WizardLogin.newInstance] factory method to
 * create an instance of this fragment.
 *
 */
class WizardLogin : WizardFragment() {
	private lateinit var parentContext: Context
	private lateinit var listener: WizardFragmentListener

	private lateinit var loginButton: Button
	private lateinit var logoutButton: Button
	private lateinit var progressBar: ProgressBar
	private lateinit var progressBarText: TextView

	private lateinit var requestName: CheckBox
	private lateinit var requestImage: CheckBox
	private lateinit var requestNode: CheckBox

	override fun onCreateView(
		inflater: LayoutInflater, container: ViewGroup?,
		savedInstanceState: Bundle?
	): View? {
		// Inflate the layout for this fragment
		return inflater.inflate(R.layout.fragment_wizard_login, container, false)
	}

	override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
		super.onViewCreated(view, savedInstanceState)

		loginButton = view.findViewById(R.id.wizard_login_button)
		logoutButton = view.findViewById(R.id.wizard_logout_button)
		progressBar = view.findViewById(R.id.wizard_login_progress)
		progressBarText = view.findViewById(R.id.wizard_login_progress_text)

		requestName = view.findViewById(R.id.wizard_socket_ip_box)
		requestImage = view.findViewById(R.id.wizard_socket_connected_box)
		requestNode = view.findViewById(R.id.wizard_login_wifi_box)

		loginButton.setOnClickListener {
			buttonView: View ->
				val providers = arrayListOf(
					AuthUI.IdpConfig.EmailBuilder().build()
				)
				startActivityForResult(AuthUI
					.getInstance()
					.createSignInIntentBuilder()
					.setAvailableProviders(providers)
					.build(), 0)
		}

		logoutButton.setOnClickListener {
			if(::listener.isInitialized) {
				listener.onLogout()
			}
		}

		setLoginState(false)

		if(::listener.isInitialized) {
			listener.onLoginReady()
		}
	}

	override fun onAttach(context: Context) {
		super.onAttach(context)

		parentContext = context
	}

	override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
		super.onActivityResult(requestCode, resultCode, data)

		Log.d(javaClass.canonicalName, "Activity Result")
		when(requestCode) {
			0 ->
				if(resultCode == Activity.RESULT_OK) {
					onLogin()
				}
				else {
					onLoginFail()
				}
		}
	}

	override fun onFragmentActive() {

	}

	override fun onFragmentNonActive() {

	}

	override fun setListener(listener: WizardFragmentListener) {
		this.listener = listener
	}

	fun onLogin() {
		if(::listener.isInitialized)
			listener.onLogin()
	}

	fun onLoginFail() {

	}

	fun setRequestName(value: Boolean) {
		this.requestName.isChecked = value
	}

	fun setRequestImage(value: Boolean) {
		this.requestImage.isChecked = value
	}

	fun setRequestNode(value: Boolean) {
		this.requestNode.isChecked = value
	}

	fun setLoginState(loggedIn: Boolean) {
		if(loggedIn && !hasUserData()) {
			loginButton.visibility = View.GONE
			progressBar.visibility = View.VISIBLE
			progressBarText.visibility = View.VISIBLE
			logoutButton.visibility = View.GONE
		}
		else if(loggedIn && hasUserData()) {
			loginButton.visibility = View.GONE
			progressBar.visibility = View.GONE
			progressBarText.visibility = View.GONE
			logoutButton.visibility = View.VISIBLE
		}
		else {
			loginButton.visibility = View.VISIBLE
			progressBar.visibility = View.GONE
			progressBarText.visibility = View.GONE
			logoutButton.visibility = View.GONE
		}
	}

	fun hasUserData(): Boolean {
		return ::requestName.isInitialized && requestImage.isChecked && requestName.isChecked && requestNode.isChecked
	}

	companion object {
		@JvmStatic
		fun newInstance() =
			WizardLogin().apply {
				arguments = Bundle().apply {
				}
			}
	}
}
