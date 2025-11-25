using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: .../api/User
    public class UsersController : ControllerBase
    {
        private readonly IUsersService _service;
        public UsersController(IUsersService service) => _service = service;

        // --- GET ALL USERS (paginated and filtered) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetUserDto>>> GetAll(
            [FromQuery] PaginationParams pagination,
            [FromQuery] string? search,
            [FromQuery] UserRole? role,
            [FromQuery] bool? isActive,
            [FromQuery] string? orderBy,
            [FromQuery] string? sortDirection,
            CancellationToken ct)
        {
            var result = await _service.GetAllAsync(pagination, search, role, isActive, orderBy, sortDirection, ct);
            return Ok(result);
        }

        // --- GET USER BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetUserDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var user = await _service.GetByIdAsync(id, ct);
            return user is null ? NotFound() : Ok(user);
        }

        // --- UPDATE USER ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateUserDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var ok = await _service.UpdateAsync(id, dto, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- DEACTIVATE USER ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Deactivate([FromRoute] int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeactivateAsync(id, ct);
                return ok
                    ? Ok(new { message = "User account deactivated successfully." })
                    : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- ACTIVATE USER ---
        [HttpPut("{id:int}/activate")]
        public async Task<IActionResult> Activate([FromRoute] int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.ActivateAsync(id, ct);
                return ok ? Ok(new { message = "User account activated successfully." }) : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}
