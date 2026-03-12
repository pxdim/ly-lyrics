package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// Session 使用者 session 資料表 schema 定義
type Session struct {
	ent.Schema
}

// Annotations 設定資料表名稱為 sessions
func (Session) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "sessions"},
	}
}

// Fields 定義 sessions 資料表欄位
func (Session) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("user_id", uuid.UUID{}),
		field.String("token").
			MaxLen(255).
			Unique().
			NotEmpty(),
		field.Time("expires_at").
			SchemaType(map[string]string{
				dialect.Postgres: "timestamptz",
			}),
		field.Time("created_at").
			Default(time.Now).
			SchemaType(map[string]string{
				dialect.Postgres: "timestamptz",
			}).
			Immutable(),
	}
}

// Edges 定義 Session 的關聯
func (Session) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("sessions").
			Field("user_id").
			Required().
			Unique(),
	}
}
