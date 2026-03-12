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

// User 使用者資料表 schema 定義
type User struct {
	ent.Schema
}

// Annotations 設定資料表名稱為 users
func (User) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "users"},
	}
}

// Fields 定義 users 資料表欄位
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.String("email").
			MaxLen(255).
			Unique().
			NotEmpty(),
		field.String("password_hash").
			MaxLen(255).
			NotEmpty(),
		field.String("name").
			MaxLen(100).
			Optional().
			Nillable(),
		field.Bool("email_verified").
			Default(false),
		field.Time("created_at").
			Default(time.Now).
			SchemaType(map[string]string{
				dialect.Postgres: "timestamptz",
			}).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			SchemaType(map[string]string{
				dialect.Postgres: "timestamptz",
			}),
	}
}

// Edges 定義 User 的關聯
func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("songs", Song.Type),
		edge.To("playlists", Playlist.Type),
		edge.To("settings", Settings.Type).
			Unique(),
		edge.To("sessions", Session.Type),
	}
}
