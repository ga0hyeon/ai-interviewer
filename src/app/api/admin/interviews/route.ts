import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import {
  isInterviewAccessType,
  type AdminInterview,
  type InterviewAccessType,
} from "@/lib/admin-interviews";
import {
  getUserFromSessionToken,
  hasRoleAccess,
  hashPassword,
  SESSION_COOKIE_NAME,
} from "@/lib/server/auth";
import { getDbPool } from "@/lib/server/db";

export const runtime = "nodejs";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type InterviewRow = {
  id: number;
  title: string;
  starts_at: Date;
  ends_at: Date;
  talent_profile: string;
  access_type: InterviewAccessType;
  access_password_hash: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by_name: string | null;
};

type AllowlistRow = {
  interview_id: number;
  user_id: number;
  email: string;
  display_name: string;
};

type IntervieweeRow = {
  id: number;
  email: string;
  display_name: string;
};

type ParsedCreateInput = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  talentProfile: string;
  accessType: InterviewAccessType;
  accessPasswordHash: string | null;
  designatedUserIds: number[];
};

type ParsedUpdateInput = {
  id: number;
  title?: string;
  startsAt?: Date;
  endsAt?: Date;
  talentProfile?: string;
  accessType?: InterviewAccessType;
  accessPassword?: string;
  designatedUserIds?: number[];
  isActive?: boolean;
};

async function getAdminUserOrThrow(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(token);

  if (!user) {
    throw new ApiError(401, "로그인이 필요합니다.");
  }

  if (!hasRoleAccess(user.role, ["admin"])) {
    throw new ApiError(403, "관리자 권한이 필요합니다.");
  }

  return user;
}

function toUniqueIdList(value: unknown, fieldName: string) {
  if (!Array.isArray(value)) {
    throw new ApiError(400, `${fieldName} 형식이 올바르지 않습니다.`);
  }

  const ids = Array.from(
    new Set(
      value.map((item) => {
        const numberValue = Number(item);

        if (!Number.isInteger(numberValue) || numberValue <= 0) {
          throw new ApiError(400, `${fieldName}에는 유효한 사용자 ID만 전달해야 합니다.`);
        }

        return numberValue;
      }),
    ),
  );

  return ids;
}

function readRequiredText(value: unknown, fieldName: string) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    throw new ApiError(400, `${fieldName}을(를) 입력해주세요.`);
  }

  return text;
}

function readOptionalText(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "문자열 형식이 아닌 입력이 포함되어 있습니다.");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRequiredDate(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${fieldName}을(를) 입력해주세요.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} 형식이 올바르지 않습니다.`);
  }

  return date;
}

function readOptionalDate(value: unknown, fieldName: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${fieldName} 형식이 올바르지 않습니다.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} 형식이 올바르지 않습니다.`);
  }

  return date;
}

function parseCreateInput(body: unknown): ParsedCreateInput {
  const payload = (body ?? {}) as Record<string, unknown>;
  const title = readRequiredText(payload.title, "인터뷰 제목");
  const startsAt = readRequiredDate(payload.startsAt, "인터뷰 시작 시각");
  const endsAt = readRequiredDate(payload.endsAt, "인터뷰 종료 시각");
  const talentProfile = readRequiredText(payload.talentProfile, "인재 정보");
  const accessType = payload.accessType;

  if (!isInterviewAccessType(accessType)) {
    throw new ApiError(400, "인터뷰 접근방식을 선택해주세요.");
  }

  if (startsAt >= endsAt) {
    throw new ApiError(400, "인터뷰 종료 시각은 시작 시각보다 뒤여야 합니다.");
  }

  const designatedUserIds =
    accessType === "allowlist"
      ? toUniqueIdList(payload.designatedUserIds, "지정 인원")
      : [];

  if (accessType === "allowlist" && designatedUserIds.length === 0) {
    throw new ApiError(400, "지정 인원 접근 방식은 최소 1명의 인터뷰이를 선택해야 합니다.");
  }

  const rawPassword = readOptionalText(payload.accessPassword);

  if (accessType === "password") {
    if (!rawPassword || rawPassword.length < 4) {
      throw new ApiError(400, "비밀번호 접근 방식은 4자 이상의 비밀번호가 필요합니다.");
    }
  }

  return {
    title,
    startsAt,
    endsAt,
    talentProfile,
    accessType,
    accessPasswordHash: accessType === "password" ? hashPassword(rawPassword!) : null,
    designatedUserIds,
  };
}

function parseUpdateInput(body: unknown): ParsedUpdateInput {
  const payload = (body ?? {}) as Record<string, unknown>;
  const id = Number(payload.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "수정할 인터뷰 ID가 올바르지 않습니다.");
  }

  const accessType = payload.accessType;

  if (accessType !== undefined && !isInterviewAccessType(accessType)) {
    throw new ApiError(400, "인터뷰 접근방식 값이 올바르지 않습니다.");
  }

  let isActive: boolean | undefined;

  if (payload.isActive !== undefined) {
    if (typeof payload.isActive !== "boolean") {
      throw new ApiError(400, "활성 상태 값이 올바르지 않습니다.");
    }

    isActive = payload.isActive;
  }

  return {
    id,
    title: payload.title === undefined ? undefined : readRequiredText(payload.title, "인터뷰 제목"),
    startsAt: readOptionalDate(payload.startsAt, "인터뷰 시작 시각"),
    endsAt: readOptionalDate(payload.endsAt, "인터뷰 종료 시각"),
    talentProfile:
      payload.talentProfile === undefined
        ? undefined
        : readRequiredText(payload.talentProfile, "인재 정보"),
    accessType,
    accessPassword: readOptionalText(payload.accessPassword),
    designatedUserIds:
      payload.designatedUserIds === undefined
        ? undefined
        : toUniqueIdList(payload.designatedUserIds, "지정 인원"),
    isActive,
  };
}

async function assertIntervieweeIdsOrThrow(client: PoolClient, userIds: number[]) {
  if (userIds.length === 0) {
    return;
  }

  const result = await client.query<{ id: number }>(
    `
      SELECT id
      FROM auth_users
      WHERE role = 'interviewee'
      AND id = ANY($1::BIGINT[])
    `,
    [userIds],
  );

  if (result.rows.length !== userIds.length) {
    throw new ApiError(400, "지정 인원에는 interviewee 권한 사용자만 포함할 수 있습니다.");
  }
}

async function loadInterviews() {
  const pool = getDbPool();
  const interviewResult = await pool.query<InterviewRow>(
    `
      SELECT
        i.id,
        i.title,
        i.starts_at,
        i.ends_at,
        i.talent_profile,
        i.access_type,
        i.access_password_hash,
        i.is_active,
        i.created_at,
        i.updated_at,
        creator.display_name AS created_by_name
      FROM admin_interviews i
      LEFT JOIN auth_users creator ON creator.id = i.created_by
      ORDER BY i.created_at DESC
    `,
  );

  const ids = interviewResult.rows.map((row) => row.id);
  const allowlistMap = new Map<number, AdminInterview["designatedUsers"]>();

  if (ids.length > 0) {
    const allowlistResult = await pool.query<AllowlistRow>(
      `
        SELECT
          m.interview_id,
          m.user_id,
          u.email,
          u.display_name
        FROM admin_interview_allowlist_users m
        JOIN auth_users u ON u.id = m.user_id
        WHERE m.interview_id = ANY($1::BIGINT[])
        ORDER BY u.display_name ASC, u.email ASC
      `,
      [ids],
    );

    for (const row of allowlistResult.rows) {
      const current = allowlistMap.get(row.interview_id) ?? [];
      current.push({
        id: row.user_id,
        email: row.email,
        name: row.display_name,
      });
      allowlistMap.set(row.interview_id, current);
    }
  }

  const interviews: AdminInterview[] = interviewResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    talentProfile: row.talent_profile,
    accessType: row.access_type,
    hasPassword: Boolean(row.access_password_hash),
    isActive: row.is_active,
    designatedUsers: allowlistMap.get(row.id) ?? [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    createdByName: row.created_by_name,
  }));

  const intervieweeResult = await pool.query<IntervieweeRow>(
    `
      SELECT id, email, display_name
      FROM auth_users
      WHERE role = 'interviewee'
      ORDER BY display_name ASC, email ASC
    `,
  );

  const interviewees = intervieweeResult.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.display_name,
  }));

  return { interviews, interviewees };
}

export async function GET(request: NextRequest) {
  try {
    await getAdminUserOrThrow(request);
    const payload = await loadInterviews();
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "인터뷰 목록을 조회하는 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    const admin = await getAdminUserOrThrow(request);
    const parsed = parseCreateInput(await request.json());

    await client.query("BEGIN");
    await assertIntervieweeIdsOrThrow(client, parsed.designatedUserIds);

    const created = await client.query<{ id: number }>(
      `
        INSERT INTO admin_interviews (
          title,
          starts_at,
          ends_at,
          talent_profile,
          access_type,
          access_password_hash,
          is_active,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
        RETURNING id
      `,
      [
        parsed.title,
        parsed.startsAt,
        parsed.endsAt,
        parsed.talentProfile,
        parsed.accessType,
        parsed.accessPasswordHash,
        admin.id,
      ],
    );

    const interviewId = created.rows[0]?.id;

    if (!interviewId) {
      throw new ApiError(500, "인터뷰 생성 결과를 확인할 수 없습니다.");
    }

    if (parsed.accessType === "allowlist" && parsed.designatedUserIds.length > 0) {
      await client.query(
        `
          INSERT INTO admin_interview_allowlist_users (interview_id, user_id)
          SELECT $1, UNNEST($2::BIGINT[])
          ON CONFLICT DO NOTHING
        `,
        [interviewId, parsed.designatedUserIds],
      );
    }

    await client.query("COMMIT");

    const payload = await loadInterviews();
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "인터뷰 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await getAdminUserOrThrow(request);
    const parsed = parseUpdateInput(await request.json());

    const currentResult = await client.query<InterviewRow>(
      `
        SELECT
          id,
          title,
          starts_at,
          ends_at,
          talent_profile,
          access_type,
          access_password_hash,
          is_active,
          created_at,
          updated_at,
          NULL::TEXT AS created_by_name
        FROM admin_interviews
        WHERE id = $1
        LIMIT 1
      `,
      [parsed.id],
    );

    const current = currentResult.rows[0];

    if (!current) {
      throw new ApiError(404, "수정할 인터뷰를 찾을 수 없습니다.");
    }

    const currentAllowlistResult = await client.query<{ user_id: number }>(
      `
        SELECT user_id
        FROM admin_interview_allowlist_users
        WHERE interview_id = $1
      `,
      [parsed.id],
    );

    const currentAllowlist = currentAllowlistResult.rows.map((row) => row.user_id);
    const nextTitle = parsed.title ?? current.title;
    const nextStartsAt = parsed.startsAt ?? current.starts_at;
    const nextEndsAt = parsed.endsAt ?? current.ends_at;
    const nextTalentProfile = parsed.talentProfile ?? current.talent_profile;
    const nextAccessType = parsed.accessType ?? current.access_type;
    const nextIsActive = parsed.isActive ?? current.is_active;

    if (nextStartsAt >= nextEndsAt) {
      throw new ApiError(400, "인터뷰 종료 시각은 시작 시각보다 뒤여야 합니다.");
    }

    let nextPasswordHash = current.access_password_hash;
    let nextAllowlist = parsed.designatedUserIds ?? currentAllowlist;

    if (nextAccessType === "password") {
      if (parsed.accessPassword) {
        if (parsed.accessPassword.length < 4) {
          throw new ApiError(400, "비밀번호는 4자 이상이어야 합니다.");
        }

        nextPasswordHash = hashPassword(parsed.accessPassword);
      }

      if (!nextPasswordHash) {
        throw new ApiError(400, "비밀번호 접근 방식으로 변경하려면 새 비밀번호를 입력해야 합니다.");
      }

      nextAllowlist = [];
    } else {
      nextPasswordHash = null;

      if (nextAllowlist.length === 0) {
        throw new ApiError(400, "지정 인원 접근 방식은 최소 1명의 인터뷰이를 선택해야 합니다.");
      }

      await assertIntervieweeIdsOrThrow(client, nextAllowlist);
    }

    await client.query("BEGIN");

    await client.query(
      `
        UPDATE admin_interviews
        SET
          title = $2,
          starts_at = $3,
          ends_at = $4,
          talent_profile = $5,
          access_type = $6,
          access_password_hash = $7,
          is_active = $8,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        parsed.id,
        nextTitle,
        nextStartsAt,
        nextEndsAt,
        nextTalentProfile,
        nextAccessType,
        nextPasswordHash,
        nextIsActive,
      ],
    );

    await client.query(
      `
        DELETE FROM admin_interview_allowlist_users
        WHERE interview_id = $1
      `,
      [parsed.id],
    );

    if (nextAccessType === "allowlist" && nextAllowlist.length > 0) {
      await client.query(
        `
          INSERT INTO admin_interview_allowlist_users (interview_id, user_id)
          SELECT $1, UNNEST($2::BIGINT[])
          ON CONFLICT DO NOTHING
        `,
        [parsed.id, nextAllowlist],
      );
    }

    await client.query("COMMIT");

    const payload = await loadInterviews();
    return NextResponse.json(payload);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "인터뷰 수정 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getAdminUserOrThrow(request);
    const id = Number(request.nextUrl.searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, "삭제할 인터뷰 ID가 올바르지 않습니다.");
    }

    const pool = getDbPool();
    const result = await pool.query(
      `
        DELETE FROM admin_interviews
        WHERE id = $1
      `,
      [id],
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new ApiError(404, "삭제할 인터뷰를 찾을 수 없습니다.");
    }

    const payload = await loadInterviews();
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "인터뷰 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
