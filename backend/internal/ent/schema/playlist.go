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

// Playlist 播放清單資料表 schema 定義
type Playlist struct {
	ent.Schema
}

// Annotations 設定資料表名稱為 playlists
func (Playlist) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "playlists"},
	}
}

// Fields 定義 playlists 資料表欄位
func (Playlist) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.String("name").
			MaxLen(255).
			NotEmpty(),
		field.Text("description").
			Optional().
			Nillable(),
		field.UUID("user_id", uuid.UUID{}),
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

// Edges 定義 Playlist 的關聯
func (Playlist) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("playlists").
			Field("user_id").
			Required().
			Unique(),
		edge.To("playlist_songs", PlaylistSong.Type),
	}
}
