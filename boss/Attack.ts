function countIncluded<Type>( list: Array<Type>, otherList: Array<Type> ): number {
	let includedCount = 0;
	for ( let entry of otherList ) {
		if ( list.includes( entry ) ) includedCount += 1;
	}

	return includedCount;
}

export type AttackReq = {
	allOf?: Array<string>;
	anyOf?: Array<string>;
	oneOf?: Array<string>;
	noneOf?: Array<string>;
}

export class Attack {
	name: string;
	reqs: Array<AttackReq> = [];

	constructor( name: string, reqs: Array<AttackReq>=[] ) {
		this.name = name;
		this.reqs = reqs;
	}

	canEnter( state: Array<string | number> ): boolean {
		for ( let req of this.reqs ) {
			if ( req.allOf ) {
				for ( let allName of req.allOf ) {
					if ( !state.includes( allName ) ) return false;
				}
			}

			if ( req.anyOf && req.anyOf.length > 0 ) {
				let count = countIncluded( state, req.anyOf );
				if ( count == 0 ) return false;
			}

			if ( req.oneOf && req.oneOf.length > 0 ) {
				let count = countIncluded( state, req.oneOf );
				if ( count != 1 ) return false;
			}

			if ( req.noneOf && req.noneOf.length > 0 ) {
				let count = countIncluded( state, req.noneOf );

				if ( count > 0 ) return false;
			}	
		}

		return true;
	}
}