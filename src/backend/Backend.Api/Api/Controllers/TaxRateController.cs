using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")] // PATH: .../api/TaxRates
    public class TaxRateController : ControllerBase
    {
        private readonly ITaxRateService _service;
        public TaxRateController(ITaxRateService service) => _service = service;

        // --- GET ALL TAX RATES ---
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GetTaxRateDto>>> GetAll([FromQuery] bool? onlyActive, CancellationToken ct)
        {
            return Ok(await _service.GetAllAsync(onlyActive, ct));
        }

        // --- GET TAX RATE BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetTaxRateDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto is null ? NotFound() : Ok(dto);
        }

        // --- CREATE TAX RATE ---
        [HttpPost]
        public async Task<ActionResult<int>> Create([FromBody] CreateTaxRateDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var id = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id }, id);
        }

        // --- UPDATE TAX RATE ---
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTaxRateDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.UpdateAsync(id, dto, ct);
            return NoContent();
        }

        // --- DEACTIVATE TAX RATE ---
        [HttpPut("{id:int}/deactivate")]
        public async Task<IActionResult> Deactivate(int id, CancellationToken ct)
        {
            var result = await _service.DeactivateAsync(id, ct);
            return result ? NoContent() : NotFound();
        }

        // --- ACTIVATE TAX RATE ---
        [HttpPut("{id:int}/activate")]
        public async Task<IActionResult> Activate(int id, CancellationToken ct)
        {
            var result = await _service.ActivateAsync(id, ct);
            return result ? NoContent() : NotFound();
        }
    }
}