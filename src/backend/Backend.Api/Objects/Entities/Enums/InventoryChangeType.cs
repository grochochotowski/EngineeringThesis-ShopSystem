namespace Backend.Api.Objects.Entities.Enums
{
    /// <summary>
    /// Represents the type of inventory change operation.
    /// </summary>
    public enum InventoryChangeType
    {
        /// <summary>
        /// Manual addition to storage (e.g., stock adjustment, inventory count correction)
        /// </summary>
        Add = 0,

        /// <summary>
        /// Manual removal from storage (e.g., damage, loss, theft, write-off)
        /// </summary>
        Remove = 1,

        /// <summary>
        /// Manual movement between locations (e.g., reorganization, relocation)
        /// </summary>
        Move = 2,

        /// <summary>
        /// Automatic removal after POS transaction (sale completed)
        /// </summary>
        Sell = 3,

        /// <summary>
        /// Automatic addition after return transaction (customer return)
        /// </summary>
        Return = 4,

        /// <summary>
        /// Automatic addition after incoming shipment collection (received goods)
        /// </summary>
        Collect = 5,

        /// <summary>
        /// Automatic removal after outgoing shipment packed (goods sent out)
        /// </summary>
        Send = 6
    }
}
