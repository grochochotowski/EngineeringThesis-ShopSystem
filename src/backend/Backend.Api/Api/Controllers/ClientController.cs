using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    [ApiController]
    [Route("api/clients")]
    public sealed class ClientsController : ControllerBase
    {
        private readonly IClientService _service;
        public ClientsController(IClientService service) => _service = service;

        // POST /api/clients
        [HttpPost]
        public async Task<ActionResult<GetClientDto>> Create([FromBody] CreateClientDto dto, CancellationToken ct)
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

        // GET /api/clients/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetClientDto>> GetById(int id, CancellationToken ct)
        {
            var item = await _service.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        // GET /api/clients?q=...&type=...&dobFrom=...&dobTo=...
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<GetClientDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] ClientType? type,
            [FromQuery] DateTime? dobFrom,
            [FromQuery] DateTime? dobTo,
            CancellationToken ct)
        {
            var list = await _service.GetAllAsync(q, type, dobFrom, dobTo, ct);
            return Ok(list);
        }

        // PUT /api/clients/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateClientDto dto, CancellationToken ct)
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

        // DELETE /api/clients/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            try
            {
                var ok = await _service.DeleteAsync(id, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete client due to related data." });
            }
        }
    }
}