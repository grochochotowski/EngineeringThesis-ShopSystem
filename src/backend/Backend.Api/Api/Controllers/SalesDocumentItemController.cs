using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [ApiController]
    [Route("api/salesdocuments/{salesDocumentId:int}/items")]
    public class SalesDocumentItemController : ControllerBase
    {
        private readonly ISalesDocumentItemService _service;
        public SalesDocumentItemController(ISalesDocumentItemService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GetSalesDocumentItemDto>>> GetByDocument(int salesDocumentId, CancellationToken ct)
            => Ok(await _service.GetByDocumentAsync(salesDocumentId, ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetSalesDocumentItemDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto is null ? NotFound() : Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<int>> Create(int salesDocumentId, [FromBody] CreateSalesDocumentItemDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var id = await _service.CreateAsync(salesDocumentId, dto, ct);
            return CreatedAtAction(nameof(GetById), new { id, salesDocumentId }, id);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSalesDocumentItemDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            await _service.UpdateAsync(id, dto, ct);
            return NoContent();
        }
    }
}