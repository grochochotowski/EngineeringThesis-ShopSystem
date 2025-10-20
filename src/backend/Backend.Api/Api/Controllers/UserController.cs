using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // /api/users
    public class UsersController : ControllerBase
    {
        private readonly IUsersService _service;
        public UsersController(IUsersService service) => _service = service;

        [HttpPost]
        public async Task<ActionResult<GetUserDto>> Create([FromBody] CreateUserDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            try
            {
                var created = await _service.CreateAsync(dto, ct);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetUserDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var user = await _service.GetByIdAsync(id, ct);
            return user is null ? NotFound() : Ok(user);
        }

        // GET z filtrami: q, role, city, dobFrom, dobTo
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GetUserDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] UserRole? role,
            [FromQuery] string? city,
            [FromQuery] DateTime? dobFrom,
            [FromQuery] DateTime? dobTo,
            CancellationToken ct)
        {
            var list = await _service.GetAllAsync(q, role, dobFrom, dobTo, ct);
            return Ok(list);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateUserDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
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

        [HttpPut("{id:int}/credentials")]
        public async Task<IActionResult> UpdateCredentials([FromRoute] int id, [FromBody] UpdateUserPasswordOrLoginDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            try
            {
                var ok = await _service.UpdateLoginAndPasswordAsync(id, dto, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteAsync(id, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete user due to related data." });
            }
        }
    }
}