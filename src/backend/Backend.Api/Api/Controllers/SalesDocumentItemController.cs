using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/SalesDocuments/{salesDocumentId:int}/items")] // PATH: .../api/SalesDocuments/{salesDocumentId}/items
    public class SalesDocumentItemController : ControllerBase
    {
        private readonly ISalesDocumentItemService _service;
        public SalesDocumentItemController(ISalesDocumentItemService service) => _service = service;

        // --- GET SALES DOCUMENT ITEMS BY DOCUMENT ---
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GetSalesDocumentItemDto>>> GetByDocument(int salesDocumentId, CancellationToken ct)
        {
            return Ok(await _service.GetByDocumentAsync(salesDocumentId, ct));
        }

        // --- GET SALES DOCUMENT ITEM BY ID ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<GetSalesDocumentItemDto>> GetById(int id, CancellationToken ct)
        {
            var dto = await _service.GetByIdAsync(id, ct);
            return dto is null ? NotFound() : Ok(dto);
        }

        // --- CREATE SALES DOCUMENT ITEM ---
        [HttpPost]
        public async Task<ActionResult<int>> Create(int salesDocumentId, [FromBody] CreateSalesDocumentItemDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var id = await _service.CreateAsync(salesDocumentId, dto, ct);
            return CreatedAtAction(nameof(GetById), new { id, salesDocumentId }, id);
        }
    }
}