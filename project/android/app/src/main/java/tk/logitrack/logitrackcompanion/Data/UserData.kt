package tk.logitrack.logitrackcompanion.Data

import com.squareup.moshi.Json

data class UserData(@field:Json(name = "username") val username: String,
                    @field:Json(name = "firstName") val firstName: String,
                    @field:Json(name = "lastName") val lastName: String,
                    @field:Json(name = "picture") val profilePictureURL: String,
                    @field:Json(name = "node") val node: String,
                    @field:Json(name = "company") val company: String,
                    @field:Json(name = "email") val email: String
                    )