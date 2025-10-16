using Backend.Api.Api.Controllers;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers
{
    namespace Backend.Api.Controllers
    {
        [ApiController]
        [Route("api/[controller]")] // /api/clients
        public class ClientsController : ControllerBase
        {
            private readonly IClientService _service;
            public ClientsController(IClientService service) => _service = service;

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

            [HttpPost("with-address")]
            public async Task<ActionResult<GetClientDto>> CreateWithAddress([FromBody] CreateClientWithAddressDto dto, CancellationToken ct)
            {
                if (!ModelState.IsValid) return ValidationProblem(ModelState);
                try
                {
                    var created = await _service.CreateWithAddressAsync(dto, ct);
                    return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
                }
                catch (InvalidOperationException ex)
                {
                    return Conflict(new { message = ex.Message });
                }
            }

            [HttpGet("{id:int}")]
            public async Task<ActionResult<GetClientDto>> GetById([FromRoute] int id, CancellationToken ct)
            {
                var client = await _service.GetByIdAsync(id, ct);
                return client is null ? NotFound() : Ok(client);
            }

            [HttpGet]
            public async Task<ActionResult<IEnumerable<GetClientDto>>> GetAll(
                [FromQuery] string? q,
                [FromQuery] ClientType? type,
                [FromQuery] string? city,
                [FromQuery] DateTime? dobFrom,
                [FromQuery] DateTime? dobTo,
                CancellationToken ct)
            {
                var list = await _service.GetAllAsync(q, type, city, dobFrom, dobTo, ct);
                return Ok(list);
            }

            [HttpPut("{id:int}")]
            public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateClientDto dto, CancellationToken ct)
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

            [HttpPut("{id:int}/address")]
            public async Task<IActionResult> UpdateAddressFields([FromRoute] int id, [FromBody] UpdateAddressDto dto, CancellationToken ct)
            {
                if (!ModelState.IsValid) return ValidationProblem(ModelState);
                var ok = await _service.UpdateAddressFieldsAsync(id, dto, ct);
                return ok ? NoContent() : NotFound();
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
                    return Conflict(new { message = "Cannot delete client due to related data." });
                }
            }
        }
    }
}