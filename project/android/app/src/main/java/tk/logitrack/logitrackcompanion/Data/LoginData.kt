package tk.logitrack.logitrackcompanion.Data

import com.squareup.moshi.Json

data class LoginData(@field:Json(name = "token") val token: String,
                     @field:Json(name = "id") val id: String)