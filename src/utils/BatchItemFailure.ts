/**
 * Class to contain identifier (id) of record that fails processing
 */

export class BatchItemFailure {
    readonly itemIdentifier: string;

    constructor(itemIdentifier: string) {
    	this.itemIdentifier = itemIdentifier;
    }
}
