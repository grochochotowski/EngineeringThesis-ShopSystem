using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // PATH: api/Auth
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _auth;

        public AuthController(IAuthService auth)
        {
            _auth = auth;
        }

        // --- REGISTER ---
        [Authorize(Roles = "Root, Admin, CEO, Manager, DeputyManager")]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserDto dto, CancellationToken ct)
        {
            try
            {
                var result = await _auth.RegisterAsync(dto, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- LOGIN ---
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken ct)
        {
            var result = await _auth.LoginAsync(dto, ct);
            if (result == null)
                return Unauthorized(new { message = "Invalid login or password." });

            return Ok(result);
        }

        // --- REFRESH TOKEN ---
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto, CancellationToken ct)
        {
            var result = await _auth.RefreshTokenAsync(dto, ct);
            if (result == null)
                return Unauthorized(new { message = "Invalid or expired refresh token." });

            return Ok(result);
        }

        // --- CHANGE PASSWORD ---
        [Authorize(Roles = "Root, Admin, CEO, Manager, DeputyManager")]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto, CancellationToken ct)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { message = "Invalid user context." });

            var currentUserId = int.Parse(userIdClaim);
            var targetUserId = dto.UserId ?? currentUserId;
            var requireCurrent = targetUserId != currentUserId ? false : false;

            // Role check: only allow targeting self or users with lower role
            var currentRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (targetUserId != currentUserId && currentRole is null)
                return Forbid();
            if (targetUserId != currentUserId && !await _auth.CanManageUserAsync(currentUserId, targetUserId, ct))
                return Forbid();

            var success = await _auth.ChangePasswordAsync(
                targetUserId,
                dto,
                requireCurrentPassword: requireCurrent,
                ct);

            if (!success)
                return BadRequest(new { message = "Failed to change password." });

            return Ok(new { message = "Password changed successfully." });
        }

        // --- CHANGE LOGIN ---
        [Authorize(Roles = "Root, Admin, CEO, Manager, DeputyManager")]
        [HttpPost("change-login")]
        public async Task<IActionResult> ChangeLogin([FromBody] ChangeLoginDto dto, CancellationToken ct)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { message = "Invalid user context." });

            var currentUserId = int.Parse(userIdClaim);
            var targetUserId = dto.UserId ?? currentUserId;
            var requireCurrent = false;

            // Role check: only allow targeting self or users with lower role
            var currentRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (targetUserId != currentUserId && currentRole is null)
                return Forbid();
            if (targetUserId != currentUserId && !await _auth.CanManageUserAsync(currentUserId, targetUserId, ct))
                return Forbid();

            try
            {
                var success = await _auth.ChangeLoginAsync(
                    targetUserId,
                    dto,
                    requireCurrentPassword: requireCurrent,
                    ct);

                if (!success)
                    return BadRequest(new { message = "Failed to change login." });

                return Ok(new { message = "Login changed successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}
