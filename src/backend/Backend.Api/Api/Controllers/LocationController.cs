using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Backend.Api.Objects.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/location")]
    public class LocationController : ControllerBase
    {
        private readonly ILocationService _service;
        public LocationController(ILocationService service) => _service = service;

        // --- GET ALL LOCATIONS ---
        [HttpGet]
        public async Task<ActionResult<PagedResult<GetLocationDto>>> GetAll(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var result = await _service.GetAllLocationsAsync(pagination, ct);
            return Ok(result);
        }

        // --- GET LOCATION BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetLocationDto>> GetById(int id, CancellationToken ct)
        {
            var location = await _service.GetLocationByIdAsync(id, ct);
            return location == null ? NotFound() : Ok(location);
        }

        // --- CREATE LOCATION ---
        [HttpPost]
        public async Task<ActionResult<GetLocationDto>> Create([FromBody] CreateLocationDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var created = await _service.CreateLocationAsync(dto, ct);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- UPDATE LOCATION ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateLocationDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var updated = await _service.UpdateLocationAsync(id, dto, ct);
                return updated ? NoContent() : NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // --- DEACTIVATE LOCATION ---
        [HttpPatch("{id:int}/deactivate")]
        public async Task<IActionResult> Deactivate(int id, CancellationToken ct)
        {
            var deactivated = await _service.DeactivateLocationAsync(id, ct);
            return deactivated ? NoContent() : NotFound();
        }

        // --- ACTIVATE LOCATION ---
        [HttpPatch("{id:int}/activate")]
        public async Task<IActionResult> Activate(int id, CancellationToken ct)
        {
            var activated = await _service.ActivateLocationAsync(id, ct);
            return activated ? NoContent() : NotFound();
        }

        // --- DELETE LOCATION ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            try
            {
                var deleted = await _service.DeleteLocationAsync(id, ct);
                return deleted ? NoContent() : NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
