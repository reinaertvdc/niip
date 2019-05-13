package tk.logitrack.logitrackcompanion

import android.app.Activity
import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.View
import android.widget.Button
import tk.logitrack.logitrackcompanion.Data.LoginData

class LoginActivity : AppCompatActivity() {
	private lateinit var fakeLoginButton: Button

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		setContentView(R.layout.activity_login)
		fakeLoginButton = findViewById(R.id.login_fake_login_button)
		fakeLoginButton.setOnClickListener {
			view: View ->
				val data: Intent = Intent()
				data.putExtra("token", "banaan")
				data.putExtra("id", "sagwa")
				setResult(Activity.RESULT_OK, data)
				finish()
		}
	}
}
