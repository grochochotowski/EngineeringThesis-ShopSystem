using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: .../api/Clients
    public sealed class ClientsController : ControllerBase
    {
        private readonly IClientService _service;
        public ClientsController(IClientService service) => _service = service;

        // --- CREATE CLIENT ---
        [HttpPost]
        public async Task<ActionResult<GetClientDto>> Create([FromBody] CreateClientDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

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

        // --- GET CLIENT BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetClientDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var client = await _service.GetByIdAsync(id, ct);
            return client is null ? NotFound() : Ok(client);
        }

        // --- GET ALL CLIENTS (filters and paginated) ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetClientDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] ClientType? type,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? orderBy = null,
            [FromQuery] string? sortDirection = null,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.GetAllAsync(q, type, pagination, orderBy, sortDirection, ct);
            return Ok(result);
        }

        // --- UPDATE CLIENT ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateClientDto dto, CancellationToken ct)
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

        // --- DELETE CLIENT (Deactivate) ---
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
                return Conflict(new { message = "Cannot delete client due to related data." });
            }
        }

        // --- ACTIVATE CLIENT ---
        [HttpPut("{id:int}/activate")]
        public async Task<IActionResult> Activate([FromRoute] int id, CancellationToken ct)
        {
            var ok = await _service.ActivateAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }
    }
}