using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly IEventsService _service;

        public EventsController(IEventsService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<ActionResult<EventDto>> Create([FromBody] CreateEventDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var created = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<EventDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var eventDto = await _service.GetByIdAsync(id, ct);
            return eventDto == null ? NotFound() : Ok(eventDto);
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<EventDto>>> GetAll(
            [FromQuery] string? q,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? orderBy = null,
            [FromQuery] string? sortDirection = null,
            [FromQuery] string? status = null,
            CancellationToken ct = default)
        {
            var result = await _service.GetAllAsync(q, pageNumber, pageSize, orderBy, sortDirection, status, ct);
            return Ok(result);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateEventDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var ok = await _service.UpdateAsync(id, dto, ct);
            return ok ? NoContent() : NotFound();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var ok = await _service.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        [HttpPut("{id:int}/publish")]
        public async Task<IActionResult> Publish([FromRoute] int id, CancellationToken ct)
        {
            var ok = await _service.PublishAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        [HttpPut("{id:int}/cancel")]
        public async Task<IActionResult> Cancel([FromRoute] int id, CancellationToken ct)
        {
            var ok = await _service.CancelAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }
    }
}
