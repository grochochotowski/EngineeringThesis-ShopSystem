using Backend.Api.Api.Services;
using Backend.Api.Objects.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/SalesDocuments/{salesDocumentId:int}/payments")] // PATH: .../api/SalesDocuments/{salesDocumentId}/payments
    public class SalesPaymentController : ControllerBase
    {
        private readonly ISalesPaymentService _service;
        public SalesPaymentController(ISalesPaymentService service) => _service = service;

        // --- GET ALL PAYMENTS FOR A DOCUMENT ---
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GetSalesPaymentDto>>> GetByDocument(
            int salesDocumentId, CancellationToken ct)
        {
            return Ok(await _service.GetByDocumentAsync(salesDocumentId, ct));
        }

        // --- CREATE PAYMENT ---
        [HttpPost]
        public async Task<ActionResult<int>> Create(
            int salesDocumentId, [FromBody] CreateSalesPaymentDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var id = await _service.CreateAsync(salesDocumentId, dto, ct);
            return CreatedAtAction(nameof(GetByDocument), new { salesDocumentId }, id);
        }
    }
}
