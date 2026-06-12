import assert from "node:assert/strict";

import { describe, it } from "node:test";

import { ApiError } from "@/middleware/error";



export function resolveStructureLevelId(

  designationLevelId: number,

  clientLevelId?: number,

): number {

  if (clientLevelId !== undefined && clientLevelId !== designationLevelId) {

    throw new ApiError(

      400,

      "LEVEL_MISMATCH",

      "Level must match the designation level.",

    );

  }

  return designationLevelId;

}



describe("org hierarchy validation", () => {

  it("auto-fills level from designation and rejects client override mismatch", () => {

    assert.equal(resolveStructureLevelId(4), 4);

    assert.equal(resolveStructureLevelId(4, 4), 4);

    assert.throws(

      () => resolveStructureLevelId(4, 3),

      (e: unknown) => {

        assert.ok(e instanceof ApiError);

        assert.equal((e as ApiError).code, "LEVEL_MISMATCH");

        return true;

      },

    );

  });

});

