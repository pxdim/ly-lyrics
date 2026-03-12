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

// Settings 使用者設定資料表 schema 定義
type Settings struct {
	ent.Schema
}

// Annotations 設定資料表名稱為 settings
func (Settings) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "settings"},
	}
}

// Fields 定義 settings 資料表欄位
func (Settings) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("user_id", uuid.UUID{}).
			Unique(),
		field.Int("display_lines").
			Default(4),
		field.Int("font_size").
			Default(24),
		field.String("font_family").
			MaxLen(100).
			Default("Inter"),
		field.String("theme").
			MaxLen(50).
			Default("dark"),
		field.Bool("show_background").
			Default(true),
		field.String("background_color").
			MaxLen(7).
			Optional().
			Nillable(),
		field.String("text_color").
			MaxLen(7).
			Optional().
			Nillable(),
		field.String("highlight_color").
			MaxLen(7).
			Optional().
			Nillable(),
		field.Bool("auto_scroll").
			Default(true),
		field.Int("scroll_duration").
			Default(300),
		field.Bool("enable_animation").
			Default(true),
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

// Edges 定義 Settings 的關聯
func (Settings) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("settings").
			Field("user_id").
			Required().
			Unique(),
	}
}
