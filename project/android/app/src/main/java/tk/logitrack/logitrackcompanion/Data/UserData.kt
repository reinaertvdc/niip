package tk.logitrack.logitrackcompanion.Data

import com.squareup.moshi.Json

data class UserData(@field:Json(name = "firstName") val firstName: String,
                    @field:Json(name = "lastName") val lastName: String,
                    @field:Json(name = "picture") val profilePictureURL: String)